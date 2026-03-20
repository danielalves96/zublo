/// <reference path="../pb_data/types.d.ts" />

// ================================================================
// ROUTE: POST /api/ai/chat
// NOTE: All helpers are defined inside the routerAdd callback.
// In PocketBase JSVM (Goja), neither `var` assignments nor
// `function` declarations at file scope are reliably accessible
// inside routerAdd callbacks at request time. Defining everything
// inside the callback guarantees correct scoping.
// ================================================================
routerAdd("POST", "/api/ai/chat", function (e) {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  var userId = e.auth.id;

  var data = e.requestInfo().body;
  var messages = data ? data.messages : null;
  if (!messages || messages.length === 0) {
    return e.json(400, { error: "Messages are required" });
  }
  // conversation_id ties this request to a persisted conversation;
  // display_message is the user-visible version of the new message (stored in DB).
  var conversationId = data ? (data.conversation_id || null) : null;
  var displayMessage = data ? (data.display_message || null) : null;

  // ── Determine if user is admin ─────────────────────────────────
  var isAdmin = false;
  try {
    var allUsers = $app.findRecordsByFilter("users", "", "+created", 1, 0);
    if (allUsers.length > 0 && allUsers[0].id === userId) {
      isAdmin = true;
    }
  } catch (_) { }

  // ── Helpers ────────────────────────────────────────────────────

  function getResponseText(res) {
    if (typeof res.text === "string" && res.text.length > 0) return res.text;
    if (typeof res.body === "string" && res.body.length > 0) return res.body;
    if (typeof res.raw === "string" && res.raw.length > 0) return res.raw;
    return String(res.text !== undefined ? res.text : (res.body !== undefined ? res.body : ""));
  }

  function buildGeminiContents(msgs) {
    var result = [];
    var i = 0;
    while (i < msgs.length) {
      var m = msgs[i];
      if (m.role === "system") { i++; continue; }

      if (m.role === "tool") {
        var toolParts = [];
        while (i < msgs.length && msgs[i].role === "tool") {
          var t = msgs[i];
          toolParts.push({ functionResponse: { name: t.name, response: { output: t.content } } });
          i++;
        }
        result.push({ role: "user", parts: toolParts });
        continue;
      }

      if (m.role === "assistant" && m.tool_calls) {
        var parts = [];
        for (var k = 0; k < m.tool_calls.length; k++) {
          var tc = m.tool_calls[k];
          parts.push({
            functionCall: {
              name: tc.function.name,
              args: typeof tc.function.arguments === "string"
                ? JSON.parse(tc.function.arguments)
                : (tc.function.arguments || {})
            }
          });
        }
        result.push({ role: "model", parts: parts });
        i++;
        continue;
      }

      result.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content || "" }]
      });
      i++;
    }
    return result;
  }

  function callAI(aiSettings, msgs, tools) {
    var rawUrl = (aiSettings.get("url") || "").replace(/\/$/, "");
    var apiKey = aiSettings.get("api_key");
    var model = aiSettings.get("model");
    var isGemini = rawUrl.indexOf("generativelanguage.googleapis.com") !== -1;

    var url, headers, body;

    if (isGemini) {
      var geminiModel = model || "gemini-1.5-flash";
      url = rawUrl + "/models/" + geminiModel + ":generateContent?key=" + (apiKey || "");
      headers = { "Content-Type": "application/json" };

      var systemMsg = null;
      for (var si = 0; si < msgs.length; si++) {
        if (msgs[si].role === "system") { systemMsg = msgs[si]; break; }
      }

      var functionDeclarations = [];
      for (var ti = 0; ti < tools.length; ti++) {
        functionDeclarations.push({
          name: tools[ti].function.name,
          description: tools[ti].function.description,
          parameters: tools[ti].function.parameters
        });
      }

      body = { contents: buildGeminiContents(msgs), generationConfig: { maxOutputTokens: 4096 } };
      // Only include tools block when there are actual declarations;
      // an empty functionDeclarations array causes Gemini API errors.
      if (functionDeclarations.length > 0) {
        body.tools = [{ functionDeclarations: functionDeclarations }];
      }
      if (systemMsg) {
        body.systemInstruction = { parts: [{ text: systemMsg.content }] };
      }
    } else {
      url = rawUrl + "/chat/completions";
      headers = { "Content-Type": "application/json" };
      if (apiKey) headers["Authorization"] = "Bearer " + apiKey;
      body = {
        model: model || "gpt-3.5-turbo",
        messages: msgs,
        temperature: 0.7,
        max_tokens: 4096
      };
      // Only include tools when there are some; omitting them forces a text-only response.
      if (tools && tools.length > 0) {
        body.tools = tools;
        body.tool_choice = "auto";
      }
    }

    var res = $http.send({ url: url, method: "POST", headers: headers, body: JSON.stringify(body) });

    if (res.statusCode !== 200) {
      throw new Error("AI API error " + res.statusCode + ": " + getResponseText(res));
    }

    var resData = JSON.parse(getResponseText(res));

    if (isGemini) {
      var candidate = resData.candidates && resData.candidates[0];
      if (!candidate || !candidate.content || !candidate.content.parts) {
        throw new Error("Unexpected Gemini response format");
      }
      var gParts = candidate.content.parts;
      var funcCalls = [];
      for (var pi = 0; pi < gParts.length; pi++) {
        if (gParts[pi].functionCall) funcCalls.push(gParts[pi]);
      }
      if (funcCalls.length > 0) {
        var tcs = [];
        for (var fi = 0; fi < funcCalls.length; fi++) {
          var fc = funcCalls[fi].functionCall;
          tcs.push({ id: "gemini_" + fc.name + "_" + fi, name: fc.name, arguments: fc.args || {} });
        }
        return { tool_calls: tcs };
      }
      var textParts = [];
      for (var xi = 0; xi < gParts.length; xi++) {
        if (gParts[xi].text) textParts.push(gParts[xi].text);
      }
      return { text: textParts.join("") };
    } else {
      var choice = resData.choices && resData.choices[0];
      if (!choice || !choice.message) {
        if (resData.message && resData.message.content) {
          return { text: resData.message.content };
        }
        throw new Error("Unexpected AI response format");
      }
      var msg = choice.message;
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        var toolCalls = [];
        for (var ci = 0; ci < msg.tool_calls.length; ci++) {
          var tc2 = msg.tool_calls[ci];
          toolCalls.push({
            id: tc2.id,
            name: tc2.function.name,
            arguments: typeof tc2.function.arguments === "string"
              ? JSON.parse(tc2.function.arguments)
              : (tc2.function.arguments || {})
          });
        }
        return { tool_calls: toolCalls, reasoning_content: msg.reasoning_content || null };
      }
      return { text: msg.content || "" };
    }
  }

  // ── Tool executors ─────────────────────────────────────────────

  function executeTool_get_subscriptions(uid) {
    try {
      var subs = $app.findRecordsByFilter(
        "subscriptions",
        "user = {:userId}",
        "inactive,name", 0, 0,
        { userId: uid }
      );
      var result = [];
      for (var i = 0; i < subs.length; i++) {
        var sub = subs[i];
        var currencySymbol = "$";
        var currencyCode = "";
        var curId = sub.get("currency");
        if (curId) {
          try {
            var cur = $app.findRecordById("currencies", curId);
            currencySymbol = cur.get("symbol") || "$";
            currencyCode = cur.get("code") || "";
          } catch (_) { }
        }
        var cycleName = "Monthly";
        var cycleId = sub.get("cycle");
        if (cycleId) {
          try {
            var cycle = $app.findRecordById("cycles", cycleId);
            cycleName = cycle.get("name") || "Monthly";
          } catch (_) { }
        }
        var categoryName = "";
        var catId = sub.get("category");
        if (catId) {
          try {
            var cat = $app.findRecordById("categories", catId);
            categoryName = cat.get("name") || "";
          } catch (_) { }
        }
        var paymentMethodName = "";
        var pmId = sub.get("payment_method");
        if (pmId) {
          try {
            var pm = $app.findRecordById("payment_methods", pmId);
            paymentMethodName = pm.get("name") || "";
          } catch (_) { }
        }
        result.push({
          id: sub.id,
          name: sub.get("name"),
          price: sub.get("price"),
          currency: currencyCode || currencySymbol,
          currency_symbol: currencySymbol,
          cycle: cycleName,
          frequency: sub.get("frequency") || 1,
          next_payment: sub.get("next_payment"),
          category: categoryName || "Uncategorized",
          payment_method: paymentMethodName || "",
          notes: sub.get("notes") || "",
          url: sub.get("url") || "",
          inactive: sub.get("inactive") || false,
          notify: sub.get("notify") || false,
          auto_renew: sub.get("auto_renew") || false
        });
      }
      return { subscriptions: result, count: result.length };
    } catch (err) {
      return { error: "Failed to get subscriptions: " + String(err), subscriptions: [], count: 0 };
    }
  }

  function executeTool_update_subscription(uid, args) {
    try {
      // Find subscription by name
      var subs = $app.findRecordsByFilter(
        "subscriptions",
        "user = {:userId} && name ~ {:name}",
        "", 5, 0,
        { userId: uid, name: args.name }
      );
      if (subs.length === 0) {
        return { error: "No subscription found matching '" + args.name + "'." };
      }
      if (subs.length > 1) {
        var names = [];
        for (var i = 0; i < subs.length; i++) names.push(subs[i].get("name"));
        return { error: "Multiple subscriptions match '" + args.name + "': " + names.join(", ") + ". Please use the exact name." };
      }
      var sub = subs[0];

      if (args.new_name !== undefined) sub.set("name", args.new_name);
      if (args.price !== undefined) sub.set("price", parseFloat(args.price));
      if (args.next_payment !== undefined) sub.set("next_payment", args.next_payment);
      if (args.frequency !== undefined) sub.set("frequency", parseInt(args.frequency) || 1);
      if (args.notes !== undefined) sub.set("notes", args.notes);
      if (args.url !== undefined) sub.set("url", args.url);
      if (args.notify !== undefined) sub.set("notify", !!args.notify);
      if (args.auto_renew !== undefined) sub.set("auto_renew", !!args.auto_renew);

      if (args.currency_code !== undefined) {
        var curs = $app.findRecordsByFilter(
          "currencies", "code = {:code}", "", 1, 0,
          { code: args.currency_code.toUpperCase() }
        );
        if (curs.length === 0) return { error: "Currency not found: " + args.currency_code };
        sub.set("currency", curs[0].id);
      }

      if (args.cycle !== undefined) {
        var cycles = $app.findRecordsByFilter(
          "cycles", "name = {:name}", "", 1, 0,
          { name: args.cycle }
        );
        if (cycles.length === 0) return { error: "Cycle not found: " + args.cycle + ". Use: Daily, Weekly, Monthly, or Yearly." };
        sub.set("cycle", cycles[0].id);
      }

      if (args.category_name !== undefined) {
        if (args.category_name === "" || args.category_name === null) {
          sub.set("category", "");
        } else {
          var cats = $app.findRecordsByFilter(
            "categories", "user = {:userId} && name = {:name}", "", 1, 0,
            { userId: uid, name: args.category_name }
          );
          if (cats.length > 0) {
            sub.set("category", cats[0].id);
          } else {
            var catCol = $app.findCollectionByNameOrId("categories");
            var newCat = new Record(catCol);
            newCat.set("user", uid);
            newCat.set("name", args.category_name);
            $app.save(newCat);
            sub.set("category", newCat.id);
          }
        }
      }

      if (args.payment_method_name !== undefined) {
        if (args.payment_method_name === "" || args.payment_method_name === null) {
          sub.set("payment_method", "");
        } else {
          var pms = $app.findRecordsByFilter(
            "payment_methods", "user = {:userId} && name = {:name}", "", 1, 0,
            { userId: uid, name: args.payment_method_name }
          );
          if (pms.length > 0) {
            sub.set("payment_method", pms[0].id);
          } else {
            return { error: "Payment method '" + args.payment_method_name + "' not found. Create it first." };
          }
        }
      }

      $app.save(sub);
      return { success: true, id: sub.id, name: sub.get("name"), message: "Subscription updated successfully!" };
    } catch (err) {
      return { error: "Failed to update subscription: " + String(err) };
    }
  }

  function executeTool_delete_subscription(uid, args) {
    try {
      var subs = $app.findRecordsByFilter(
        "subscriptions",
        "user = {:userId} && name = {:name}",
        "", 1, 0,
        { userId: uid, name: args.name }
      );
      if (subs.length === 0) {
        return { error: "No subscription found with exact name '" + args.name + "'." };
      }
      $app.delete(subs[0]);
      return { success: true, name: args.name, message: "Subscription '" + args.name + "' deleted successfully." };
    } catch (err) {
      return { error: "Failed to delete subscription: " + String(err) };
    }
  }

  function executeTool_set_subscription_status(uid, args) {
    try {
      var subs = $app.findRecordsByFilter(
        "subscriptions",
        "user = {:userId} && name ~ {:name}",
        "", 5, 0,
        { userId: uid, name: args.name }
      );
      if (subs.length === 0) {
        return { error: "No subscription found matching '" + args.name + "'." };
      }
      if (subs.length > 1) {
        var names = [];
        for (var i = 0; i < subs.length; i++) names.push(subs[i].get("name"));
        return { error: "Multiple subscriptions match. Please use the exact name: " + names.join(", ") };
      }
      var sub = subs[0];
      sub.set("inactive", !!args.inactive);
      $app.save(sub);
      var status = args.inactive ? "inactive" : "active";
      return { success: true, name: sub.get("name"), inactive: !!args.inactive, message: "Subscription '" + sub.get("name") + "' marked as " + status + "." };
    } catch (err) {
      return { error: "Failed to update subscription status: " + String(err) };
    }
  }

  function executeTool_get_spending_report(uid, args) {
    try {
      var period = (args && args.period) ? args.period : "last_6_months";
      var now = new Date();
      var currentYear = now.getFullYear();
      var currentMonth = now.getMonth() + 1;
      var months = [];

      if (period === "current_month") {
        months = [{ year: currentYear, month: currentMonth }];
      } else if (period === "last_3_months") {
        for (var i = 2; i >= 0; i--) {
          var d = new Date(currentYear, currentMonth - 1 - i, 1);
          months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
        }
      } else if (period === "last_12_months") {
        for (var i = 11; i >= 0; i--) {
          var d = new Date(currentYear, currentMonth - 1 - i, 1);
          months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
        }
      } else if (period === "current_year") {
        for (var m = 1; m <= currentMonth; m++) {
          months.push({ year: currentYear, month: m });
        }
      } else {
        for (var i = 5; i >= 0; i--) {
          var d = new Date(currentYear, currentMonth - 1 - i, 1);
          months.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
        }
      }

      var mainCurrencySymbol = "";
      try {
        var userRec = $app.findRecordById("users", uid);
        var mainCurId = userRec.get("main_currency");
        if (mainCurId) {
          var mainCur = $app.findRecordById("currencies", mainCurId);
          mainCurrencySymbol = mainCur.get("symbol") || "";
        }
        // Fallback: query currencies where is_main = true
        if (!mainCurrencySymbol) {
          var mainCurs2 = $app.findRecordsByFilter(
            "currencies", "user = {:userId} && is_main = true", "", 1, 0, { userId: uid }
          );
          if (mainCurs2.length > 0) mainCurrencySymbol = mainCurs2[0].get("symbol") || "";
        }
      } catch (_) { }

      var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      var monthlyData = [];
      var total = 0;

      for (var j = 0; j < months.length; j++) {
        var year = months[j].year;
        var month = months[j].month;
        try {
          var recs = $app.findRecordsByFilter(
            "yearly_costs",
            "user = {:userId} && year = {:year} && month = {:month}",
            "", 1, 0,
            { userId: uid, year: year, month: month }
          );
          var monthTotal = recs.length > 0 ? (parseFloat(recs[0].get("total")) || 0) : 0;
          total += monthTotal;
          var rounded = Math.round(monthTotal * 100) / 100;
          monthlyData.push({
            year: year,
            month: month,
            month_name: monthNames[month - 1],
            total: rounded,
            formatted: mainCurrencySymbol + rounded.toFixed(2)
          });
        } catch (_) {
          monthlyData.push({ year: year, month: month, month_name: monthNames[month - 1], total: 0, formatted: mainCurrencySymbol + "0.00" });
        }
      }

      var avg = months.length > 0 ? Math.round((total / months.length) * 100) / 100 : 0;
      return {
        period: period,
        currency_symbol: mainCurrencySymbol,
        months: monthlyData,
        total: Math.round(total * 100) / 100,
        total_formatted: mainCurrencySymbol + (Math.round(total * 100) / 100).toFixed(2),
        monthly_average: avg,
        monthly_average_formatted: mainCurrencySymbol + avg.toFixed(2)
      };
    } catch (err) {
      return { error: "Failed to get spending report: " + String(err) };
    }
  }

  function executeTool_get_payment_history(uid, args) {
    try {
      var limit = (args && args.limit) ? parseInt(args.limit) : 20;
      var records;
      if (args && args.subscription_name) {
        var subs = $app.findRecordsByFilter(
          "subscriptions",
          "user = {:userId} && name ~ {:name}",
          "", 5, 0,
          { userId: uid, name: args.subscription_name }
        );
        if (subs.length === 0) {
          return { records: [], message: "No subscription found with name: " + args.subscription_name };
        }
        records = $app.findRecordsByFilter(
          "payment_records",
          "subscription = {:subId}",
          "-due_date", limit, 0,
          { subId: subs[0].id }
        );
      } else {
        records = $app.findRecordsByFilter(
          "payment_records",
          "user = {:userId}",
          "-due_date", limit, 0,
          { userId: uid }
        );
      }
      var result = [];
      for (var i = 0; i < records.length; i++) {
        var rec = records[i];
        var subName = "";
        try {
          var sub = $app.findRecordById("subscriptions", rec.get("subscription"));
          subName = sub.get("name") || "";
        } catch (_) { }
        result.push({
          subscription: subName,
          due_date: rec.get("due_date"),
          paid_at: rec.get("paid_at") || null,
          paid: !!(rec.get("paid_at")),
          amount: rec.get("amount") || null,
          auto_paid: rec.get("auto_paid") || false
        });
      }
      return { records: result, count: result.length };
    } catch (err) {
      return { error: "Failed to get payment history: " + String(err), records: [] };
    }
  }

  function executeTool_create_subscription(uid, args) {
    try {
      // Duplicate guard — never create two subscriptions with the same name for the same user
      try {
        var dupeCheck = $app.findRecordsByFilter(
          "subscriptions", "user = {:uid} && name = {:name}", "", 1, 0,
          { uid: uid, name: args.name }
        );
        if (dupeCheck.length > 0) {
          return { error: "duplicate", skipped: true, name: args.name, message: "Subscription '" + args.name + "' already exists — skipped to avoid duplicate." };
        }
      } catch (_) { }

      var currencyId = "";
      try {
        var currencies = $app.findRecordsByFilter(
          "currencies", "code = {:code}", "", 1, 0,
          { code: (args.currency_code || "").toUpperCase() }
        );
        if (currencies.length > 0) currencyId = currencies[0].id;
      } catch (_) { }
      if (!currencyId) {
        return { error: "Currency not found: " + args.currency_code + ". Use a valid ISO 4217 code (e.g., BRL, USD, EUR). The user must add this currency in Settings → Currencies first." };
      }

      var cycleId = "";
      try {
        var cycles = $app.findRecordsByFilter(
          "cycles", "name = {:name}", "", 1, 0,
          { name: args.cycle }
        );
        if (cycles.length > 0) cycleId = cycles[0].id;
      } catch (_) { }
      if (!cycleId) {
        return { error: "Cycle not found: " + args.cycle + ". Use: Daily, Weekly, Monthly, or Yearly." };
      }

      var categoryId = "";
      if (args.category_name) {
        try {
          var cats = $app.findRecordsByFilter(
            "categories", "user = {:userId} && name = {:name}", "", 1, 0,
            { userId: uid, name: args.category_name }
          );
          if (cats.length > 0) {
            categoryId = cats[0].id;
          } else {
            var catCol = $app.findCollectionByNameOrId("categories");
            var newCat = new Record(catCol);
            newCat.set("user", uid);
            newCat.set("name", args.category_name);
            $app.save(newCat);
            categoryId = newCat.id;
          }
        } catch (_) { }
      }

      var paymentMethodId = "";
      if (args.payment_method_name) {
        try {
          var pms = $app.findRecordsByFilter(
            "payment_methods", "user = {:userId} && name = {:name}", "", 1, 0,
            { userId: uid, name: args.payment_method_name }
          );
          if (pms.length > 0) paymentMethodId = pms[0].id;
        } catch (_) { }
      }

      var col = $app.findCollectionByNameOrId("subscriptions");
      var record = new Record(col);
      record.set("user", uid);
      record.set("name", args.name);
      record.set("price", parseFloat(args.price));
      record.set("currency", currencyId);
      record.set("cycle", cycleId);
      record.set("frequency", parseInt(args.frequency) || 1);
      record.set("next_payment", args.next_payment);
      record.set("inactive", false);
      if (categoryId) record.set("category", categoryId);
      if (paymentMethodId) record.set("payment_method", paymentMethodId);
      if (args.notes) record.set("notes", args.notes);
      if (args.url) record.set("url", args.url);
      if (args.notify !== undefined) record.set("notify", !!args.notify);
      $app.save(record);

      return { success: true, id: record.id, name: args.name, message: "Subscription '" + args.name + "' created successfully!" };
    } catch (err) {
      return { error: "Failed to create subscription: " + String(err) };
    }
  }

  // ── Category tools ─────────────────────────────────────────────

  function executeTool_get_categories(uid) {
    try {
      var cats = $app.findRecordsByFilter(
        "categories", "user = {:userId}", "name", 0, 0, { userId: uid }
      );
      var result = [];
      for (var i = 0; i < cats.length; i++) {
        result.push({ id: cats[i].id, name: cats[i].get("name") });
      }
      return { categories: result, count: result.length };
    } catch (err) {
      return { error: "Failed to get categories: " + String(err), categories: [] };
    }
  }

  function executeTool_create_category(uid, args) {
    try {
      var existing = $app.findRecordsByFilter(
        "categories", "user = {:userId} && name = {:name}", "", 1, 0,
        { userId: uid, name: args.name }
      );
      if (existing.length > 0) {
        return { error: "Category '" + args.name + "' already exists." };
      }
      var col = $app.findCollectionByNameOrId("categories");
      var rec = new Record(col);
      rec.set("user", uid);
      rec.set("name", args.name);
      $app.save(rec);
      return { success: true, id: rec.id, name: args.name, message: "Category '" + args.name + "' created!" };
    } catch (err) {
      return { error: "Failed to create category: " + String(err) };
    }
  }

  function executeTool_update_category(uid, args) {
    try {
      var cats = $app.findRecordsByFilter(
        "categories", "user = {:userId} && name = {:name}", "", 1, 0,
        { userId: uid, name: args.name }
      );
      if (cats.length === 0) return { error: "Category '" + args.name + "' not found." };
      cats[0].set("name", args.new_name);
      $app.save(cats[0]);
      return { success: true, message: "Category renamed to '" + args.new_name + "'." };
    } catch (err) {
      return { error: "Failed to update category: " + String(err) };
    }
  }

  function executeTool_delete_category(uid, args) {
    try {
      var cats = $app.findRecordsByFilter(
        "categories", "user = {:userId} && name = {:name}", "", 1, 0,
        { userId: uid, name: args.name }
      );
      if (cats.length === 0) return { error: "Category '" + args.name + "' not found." };
      $app.delete(cats[0]);
      return { success: true, name: args.name, message: "Category '" + args.name + "' deleted." };
    } catch (err) {
      return { error: "Failed to delete category: " + String(err) };
    }
  }

  function executeTool_bulk_rename_categories(uid, args) {
    try {
      var renames = args.renames;
      if (!renames || renames.length === 0) {
        return { error: "No renames provided." };
      }

      // Load ALL categories once to enable case-insensitive JS matching
      var allCats = $app.findRecordsByFilter(
        "categories", "user = {:userId}", "name", 0, 0, { userId: uid }
      );

      var success = 0;
      var failed = [];
      for (var i = 0; i < renames.length; i++) {
        var pair = renames[i];
        try {
          // Case-insensitive, trimmed match against real stored names
          var searchKey = pair.name.toLowerCase().trim();
          var found = null;
          for (var j = 0; j < allCats.length; j++) {
            if (allCats[j].get("name").toLowerCase().trim() === searchKey) {
              found = allCats[j];
              break;
            }
          }
          if (!found) {
            failed.push({ name: pair.name, reason: "Not found" });
            continue;
          }
          found.set("name", pair.new_name);
          $app.save(found);
          // Update the in-memory record so later iterations see the new name
          // (avoids re-fetching from DB mid-loop)
          success++;
        } catch (err) {
          failed.push({ name: pair.name, reason: String(err) });
        }
      }
      var msg = success + " of " + renames.length + " categories renamed successfully.";
      if (failed.length > 0) {
        msg += " Failed: " + failed.map(function (f) { return f.name + " (" + f.reason + ")"; }).join(", ");
      }
      return { success: success, failed: failed, total: renames.length, message: msg };
    } catch (err) {
      return { error: "Failed to bulk rename categories: " + String(err) };
    }
  }

  // ── Batch create subscriptions (used after spreadsheet analysis) ──

  function executeTool_batch_create_subscriptions(uid, args) {
    try {
      var subs = args.subscriptions;
      if (!subs || subs.length === 0) {
        return { error: "No subscriptions provided." };
      }
      var created = 0;
      var skipped_duplicates = [];
      var failed = [];
      var createdNames = [];
      for (var i = 0; i < subs.length; i++) {
        var subArgs = subs[i];
        var result = executeTool_create_subscription(uid, subArgs);
        if (result.success) {
          created++;
          createdNames.push(subArgs.name || ("row " + (i + 1)));
        } else if (result.skipped) {
          skipped_duplicates.push(subArgs.name || ("row " + (i + 1)));
        } else {
          failed.push({
            name: subArgs.name || ("row " + (i + 1)),
            reason: result.error
          });
        }
      }
      var msg = created + " of " + subs.length + " subscriptions created.";
      if (skipped_duplicates.length > 0) {
        msg += " Skipped " + skipped_duplicates.length + " duplicate(s): " + skipped_duplicates.join(", ") + ".";
      }
      if (failed.length > 0) {
        msg += " " + failed.length + " failed — reasons: " + failed.map(function (f) { return f.name + ": " + f.reason; }).join("; ") + ".";
      }
      return {
        success: created > 0 || skipped_duplicates.length > 0,
        created: created,
        skipped_duplicates: skipped_duplicates,
        failed: failed,
        total: subs.length,
        created_names: createdNames,
        // Signal the AI loop to stop — do not call any creation tool again
        import_complete: true,
        message: msg
      };
    } catch (err) {
      return { error: "Failed to batch import subscriptions: " + String(err) };
    }
  }

  // ── Export tool ────────────────────────────────────────────────

  function executeTool_export_subscriptions(uid, args) {
    try {
      var format = (args && args.format) ? args.format : "json";
      var subs = $app.findRecordsByFilter(
        "subscriptions", "user = {:userId}", "name", 0, 0, { userId: uid }
      );
      var exported = [];
      for (var i = 0; i < subs.length; i++) {
        var sub = subs[i];
        var currencySymbol = "", currencyCode = "";
        try {
          var cur = $app.findRecordById("currencies", sub.get("currency"));
          currencySymbol = cur.get("symbol") || "";
          currencyCode = cur.get("code") || "";
        } catch (_) { }
        var cycleName = "";
        try {
          var cyc = $app.findRecordById("cycles", sub.get("cycle"));
          cycleName = cyc.get("name") || "";
        } catch (_) { }
        var paymentMethodName = "";
        try {
          var pm = $app.findRecordById("payment_methods", sub.get("payment_method"));
          paymentMethodName = pm.get("name") || "";
        } catch (_) { }
        var categoryName = "";
        try {
          var cat = $app.findRecordById("categories", sub.get("category"));
          categoryName = cat.get("name") || "";
        } catch (_) { }
        var payerName = "";
        try {
          var payer = $app.findRecordById("household", sub.get("payer"));
          payerName = payer.get("name") || "";
        } catch (_) { }
        exported.push({
          name: sub.get("name"),
          price: sub.get("price"),
          currency: currencyCode,
          currency_symbol: currencySymbol,
          cycle: cycleName,
          frequency: sub.get("frequency"),
          next_payment: sub.get("next_payment"),
          start_date: sub.get("start_date") || "",
          category: categoryName,
          payment_method: paymentMethodName,
          payer: payerName,
          auto_renew: sub.get("auto_renew") || false,
          inactive: sub.get("inactive") || false,
          notify: sub.get("notify") || false,
          notify_days_before: sub.get("notify_days_before") || 3,
          notes: sub.get("notes") || "",
          url: sub.get("url") || "",
          cancellation_date: sub.get("cancellation_date") || ""
        });
      }
      var filename = "zublo-subscriptions." + (format === "xlsx" ? "xlsx" : "json");
      return {
        success: true,
        format: format,
        filename: filename,
        data: exported,
        count: exported.length,
        message: exported.length + " subscription(s) ready for download as " + filename + "."
      };
    } catch (err) {
      return { error: "Failed to export subscriptions: " + String(err) };
    }
  }

  // ── Payment method tools ───────────────────────────────────────

  function executeTool_get_payment_methods(uid) {
    try {
      var pms = $app.findRecordsByFilter(
        "payment_methods", "user = {:userId}", "order,name", 0, 0, { userId: uid }
      );
      var result = [];
      for (var i = 0; i < pms.length; i++) {
        result.push({ id: pms[i].id, name: pms[i].get("name") });
      }
      return { payment_methods: result, count: result.length };
    } catch (err) {
      return { error: "Failed to get payment methods: " + String(err), payment_methods: [] };
    }
  }

  function executeTool_create_payment_method(uid, args) {
    try {
      var existing = $app.findRecordsByFilter(
        "payment_methods", "user = {:userId} && name = {:name}", "", 1, 0,
        { userId: uid, name: args.name }
      );
      if (existing.length > 0) return { error: "Payment method '" + args.name + "' already exists." };
      var col = $app.findCollectionByNameOrId("payment_methods");
      var rec = new Record(col);
      rec.set("user", uid);
      rec.set("name", args.name);
      $app.save(rec);
      return { success: true, id: rec.id, name: args.name, message: "Payment method '" + args.name + "' created!" };
    } catch (err) {
      return { error: "Failed to create payment method: " + String(err) };
    }
  }

  function executeTool_delete_payment_method(uid, args) {
    try {
      var pms = $app.findRecordsByFilter(
        "payment_methods", "user = {:userId} && name = {:name}", "", 1, 0,
        { userId: uid, name: args.name }
      );
      if (pms.length === 0) return { error: "Payment method '" + args.name + "' not found." };
      $app.delete(pms[0]);
      return { success: true, name: args.name, message: "Payment method '" + args.name + "' deleted." };
    } catch (err) {
      return { error: "Failed to delete payment method: " + String(err) };
    }
  }

  function executeTool_rename_payment_method(uid, args) {
    try {
      var pms = $app.findRecordsByFilter(
        "payment_methods", "user = {:userId} && name = {:name}", "", 1, 0,
        { userId: uid, name: args.old_name }
      );
      if (pms.length === 0) return { error: "Payment method '" + args.old_name + "' not found." };
      var existing = $app.findRecordsByFilter(
        "payment_methods", "user = {:userId} && name = {:name}", "", 1, 0,
        { userId: uid, name: args.new_name }
      );
      if (existing.length > 0) return { error: "A payment method named '" + args.new_name + "' already exists." };
      pms[0].set("name", args.new_name);
      $app.save(pms[0]);
      return { success: true, old_name: args.old_name, new_name: args.new_name, message: "Payment method renamed from '" + args.old_name + "' to '" + args.new_name + "'." };
    } catch (err) {
      return { error: "Failed to rename payment method: " + String(err) };
    }
  }

  // ── Household member tools ─────────────────────────────────────

  function executeTool_get_household_members(uid) {
    try {
      var members = $app.findRecordsByFilter(
        "household", "user = {:userId}", "name", 0, 0, { userId: uid }
      );
      var result = [];
      for (var i = 0; i < members.length; i++) {
        result.push({ id: members[i].id, name: members[i].get("name") });
      }
      return { members: result, count: result.length };
    } catch (err) {
      return { error: "Failed to get household members: " + String(err), members: [] };
    }
  }

  function executeTool_create_household_member(uid, args) {
    try {
      var existing = $app.findRecordsByFilter(
        "household", "user = {:userId} && name = {:name}", "", 1, 0,
        { userId: uid, name: args.name }
      );
      if (existing.length > 0) return { error: "Household member '" + args.name + "' already exists." };
      var col = $app.findCollectionByNameOrId("household");
      var rec = new Record(col);
      rec.set("user", uid);
      rec.set("name", args.name);
      $app.save(rec);
      return { success: true, id: rec.id, name: args.name, message: "Household member '" + args.name + "' created!" };
    } catch (err) {
      return { error: "Failed to create household member: " + String(err) };
    }
  }

  function executeTool_delete_household_member(uid, args) {
    try {
      var members = $app.findRecordsByFilter(
        "household", "user = {:userId} && name = {:name}", "", 1, 0,
        { userId: uid, name: args.name }
      );
      if (members.length === 0) return { error: "Household member '" + args.name + "' not found." };
      $app.delete(members[0]);
      return { success: true, name: args.name, message: "Household member '" + args.name + "' deleted." };
    } catch (err) {
      return { error: "Failed to delete household member: " + String(err) };
    }
  }

  function executeTool_rename_household_member(uid, args) {
    try {
      var members = $app.findRecordsByFilter(
        "household", "user = {:userId} && name = {:name}", "", 1, 0,
        { userId: uid, name: args.old_name }
      );
      if (members.length === 0) return { error: "Household member '" + args.old_name + "' not found." };
      var existing = $app.findRecordsByFilter(
        "household", "user = {:userId} && name = {:name}", "", 1, 0,
        { userId: uid, name: args.new_name }
      );
      if (existing.length > 0) return { error: "A household member named '" + args.new_name + "' already exists." };
      members[0].set("name", args.new_name);
      $app.save(members[0]);
      return { success: true, old_name: args.old_name, new_name: args.new_name, message: "Household member renamed from '" + args.old_name + "' to '" + args.new_name + "'." };
    } catch (err) {
      return { error: "Failed to rename household member: " + String(err) };
    }
  }

  // ── Currency tools ─────────────────────────────────────────────

  function executeTool_get_currencies(uid) {
    try {
      var curs = $app.findRecordsByFilter(
        "currencies", "user = {:userId}", "-is_main,code", 0, 0, { userId: uid }
      );
      var result = [];
      for (var i = 0; i < curs.length; i++) {
        result.push({
          id: curs[i].id,
          code: curs[i].get("code"),
          symbol: curs[i].get("symbol"),
          name: curs[i].get("name") || "",
          is_main: !!curs[i].get("is_main")
        });
      }
      return { currencies: result, count: result.length };
    } catch (err) {
      return { error: "Failed to get currencies: " + String(err), currencies: [] };
    }
  }

  function executeTool_add_currency(uid, args) {
    try {
      var existing = $app.findRecordsByFilter(
        "currencies", "user = {:userId} && code = {:code}", "", 1, 0,
        { userId: uid, code: args.code.toUpperCase() }
      );
      if (existing.length > 0) return { error: "Currency '" + args.code.toUpperCase() + "' already exists." };
      var col = $app.findCollectionByNameOrId("currencies");
      var rec = new Record(col);
      rec.set("user", uid);
      rec.set("code", args.code.toUpperCase());
      rec.set("symbol", args.symbol);
      if (args.name) rec.set("name", args.name);
      $app.save(rec);
      return { success: true, id: rec.id, code: args.code.toUpperCase(), message: "Currency " + args.code.toUpperCase() + " added!" };
    } catch (err) {
      return { error: "Failed to add currency: " + String(err) };
    }
  }

  function executeTool_set_main_currency(uid, args) {
    try {
      var curs = $app.findRecordsByFilter(
        "currencies", "user = {:userId} && code = {:code}", "", 1, 0,
        { userId: uid, code: args.code.toUpperCase() }
      );
      if (curs.length === 0) return { error: "Currency '" + args.code.toUpperCase() + "' not found. Add it first." };
      var userRec = $app.findRecordById("users", uid);
      userRec.set("main_currency", curs[0].id);
      $app.save(userRec);
      return { success: true, code: args.code.toUpperCase(), message: "Main currency set to " + args.code.toUpperCase() + "." };
    } catch (err) {
      return { error: "Failed to set main currency: " + String(err) };
    }
  }

  function executeTool_remove_currency(uid, args) {
    try {
      var curs = $app.findRecordsByFilter(
        "currencies", "user = {:userId} && code = {:code}", "", 1, 0,
        { userId: uid, code: args.code.toUpperCase() }
      );
      if (curs.length === 0) return { error: "Currency '" + args.code.toUpperCase() + "' not found." };
      // Check if it's the main currency
      var userRec = $app.findRecordById("users", uid);
      if (userRec.get("main_currency") === curs[0].id) {
        return { error: "Cannot remove the main currency. Set another currency as main first." };
      }
      $app.delete(curs[0]);
      return { success: true, code: args.code.toUpperCase(), message: "Currency " + args.code.toUpperCase() + " removed." };
    } catch (err) {
      return { error: "Failed to remove currency: " + String(err) };
    }
  }

  // ── Permission check tool ──────────────────────────────────────

  function executeTool_check_permission(adminFlag) {
    return {
      is_admin: adminFlag,
      message: adminFlag
        ? "You have admin privileges. You can access all features including admin panel settings."
        : "You do not have admin privileges. Admin-only actions (managing users, SMTP, OIDC, registration settings, etc.) require admin access. If you need these actions performed, please ask your Zublo administrator."
    };
  }

  // ── App help tool ──────────────────────────────────────────────

  function executeTool_get_app_help(args) {
    var topic = (args && args.topic) ? args.topic : "general";
    var help = {
      general:
        "Zublo is a subscription management app. Main sections:\n" +
        "- **Dashboard** (`/`): Financial summary, upcoming payments, totals.\n" +
        "- **Subscriptions** (`/subscriptions`): Full list of all your subscriptions.\n" +
        "- **Calendar** (`/calendar`): Payments in calendar view.\n" +
        "- **Statistics** (`/statistics`): Spending charts by month, category, payment method.\n" +
        "- **Settings** (`/settings`): Currencies, categories, payment methods, household, notifications, AI, exchange rates, profile.\n" +
        "- **Admin Panel** (`/admin`): Admin-only. Users, registration, SMTP, OIDC, backups, cron jobs, maintenance.\n" +
        "- **AI Chat** (`/chat`): This chat — I can read and write your data directly.",

      subscriptions:
        "**Managing subscriptions:**\n\n" +
        "**Subscription fields:**\n" +
        "- **Name** (required) — service name (e.g., Netflix, Spotify).\n" +
        "- **Price** (required) — amount charged per cycle, positive number.\n" +
        "- **Currency** (required) — ISO 4217 code (BRL, USD, EUR, etc.).\n" +
        "- **Cycle** (required) — exactly: `Daily`, `Weekly`, `Monthly`, or `Yearly` (case-sensitive).\n" +
        "- **Frequency** (required) — positive integer ≥ 1, default 1. Frequency=3+Monthly = quarterly.\n" +
        "- **Next payment** (required) — ISO date `YYYY-MM-DD`.\n" +
        "- **Start date** — when subscription began; used for progress bars.\n" +
        "- **Category** — optional grouping (e.g., Streaming, Software).\n" +
        "- **Payment method** — optional (e.g., Nubank, PayPal).\n" +
        "- **Payer** — optional household member responsible for payment.\n" +
        "- **Notes** — free-form text.\n" +
        "- **URL** — service website link.\n" +
        "- **Logo** — uploaded image or auto-searched by name.\n" +
        "- **Auto-renew** — if on, daily cron marks as paid automatically.\n" +
        "- **Inactive** — soft-cancel flag; excluded from totals.\n" +
        "- **Cancellation date** — optional date of cancellation.\n" +
        "- **Replacement subscription** — links old sub to the new replacement.\n" +
        "- **Notify** — include in notification reminders.\n\n" +
        "**Add a new subscription:**\n" +
        "1. Go to the Subscriptions page.\n" +
        "2. Click the **+** (Add) button in the top-right area.\n" +
        "3. Fill in: Name, Price, Currency, Billing Cycle, Next Payment Date.\n" +
        "4. Optionally set: Category, Payment Method, Notes, URL, Notify toggle.\n" +
        "5. Click **Save**.\n\n" +
        "**Edit a subscription:**\n" +
        "1. Click on the subscription card to open its detail panel.\n" +
        "2. Click the **pencil (edit) icon**.\n" +
        "3. Modify the fields you want to change.\n" +
        "4. Click **Save**.\n\n" +
        "**Delete a subscription:**\n" +
        "1. Click on the subscription card to open its detail panel.\n" +
        "2. Click the **trash (delete) icon**.\n" +
        "3. Confirm the deletion in the confirmation dialog.\n\n" +
        "**Mark as inactive (pause):**\n" +
        "1. Open the subscription's edit form.\n" +
        "2. Toggle the **Inactive** switch on.\n" +
        "3. Save.\n\n" +
        "**Clone a subscription:**\n" +
        "1. Open the subscription detail panel.\n" +
        "2. Click the **clone icon**.\n\n" +
        "**Export subscriptions:**\n" +
        "- On the Subscriptions page, click the **Export** button → choose JSON or XLSX.\n\n" +
        "**Import subscriptions:**\n" +
        "- Settings → Import → select a Wallos or Zublo JSON file.",

      payment_tracking:
        "**Payment tracking & proof of payment:**\n\n" +
        "**Enable payment tracking:**\n" +
        "1. Settings → Payment Tracking tab.\n" +
        "2. Toggle **Enable Payment Tracking** on.\n\n" +
        "**Mark a subscription as paid:**\n" +
        "1. On the Subscriptions page, click on the subscription that shows **Unpaid** or **Overdue**.\n" +
        "2. Click **Mark as Paid**.\n" +
        "3. Optionally enter the amount paid and upload a proof file (PDF or image, max 15 MB).\n" +
        "4. Click **Confirm**.\n\n" +
        "**View a payment proof:**\n" +
        "1. Open the subscription detail panel.\n" +
        "2. Find the payment record in the payment history section.\n" +
        "3. Click **View Proof** to open/download the file.",

      notifications:
        "**Setting up notifications:**\n\n" +
        "1. Go to Settings → Notifications tab.\n" +
        "2. Choose one or more channels: Email, Discord, Telegram, Gotify, Pushover, ntfy, Pushplus, Mattermost, ServerChan, Webhook.\n" +
        "3. For each channel, enable it and fill in the required credentials.\n" +
        "4. Click **Save** for each channel.\n" +
        "5. Set **reminder schedule**: how many days before each payment to be notified (0 = on payment day, 1 = 1 day before, etc.).\n" +
        "6. Click **Test** to verify the channel is working.",

      categories:
        "**Managing categories:**\n\n" +
        "**Add a category:**\n" +
        "1. Settings → Categories tab.\n" +
        "2. Type the category name in the input field.\n" +
        "3. Click **Add** (or press Enter).\n\n" +
        "**Rename a category:**\n" +
        "1. Settings → Categories tab.\n" +
        "2. Click the **pencil icon** next to the category.\n" +
        "3. Enter the new name and click **Save**.\n\n" +
        "**Delete a category:**\n" +
        "1. Settings → Categories tab.\n" +
        "2. Click the **trash icon** next to the category and confirm.",

      currencies:
        "**Managing currencies:**\n\n" +
        "**Add a currency:**\n" +
        "1. Settings → Currencies tab.\n" +
        "2. Enter the ISO code (e.g., BRL, USD, EUR) and symbol (e.g., R$, $, €).\n" +
        "3. Click **Add Currency**.\n\n" +
        "**Set the main currency:**\n" +
        "1. Settings → Currencies tab.\n" +
        "2. Click **Set as Main** next to the currency you want as your primary. All totals will be converted to it.\n\n" +
        "**Remove a currency:**\n" +
        "1. Settings → Currencies tab.\n" +
        "2. Click the **trash icon** next to the currency (cannot remove the main currency).\n\n" +
        "**Automatic exchange rates:**\n" +
        "1. Settings → Exchange Rate API tab.\n" +
        "2. Enter your Fixer.io or APILayer API key and enable it.",

      payment_methods:
        "**Managing payment methods:**\n\n" +
        "**Add a payment method (UI):**\n" +
        "1. Settings → Payment Methods tab.\n" +
        "2. Enter the name (e.g., Visa, PayPal, Nubank).\n" +
        "3. Click **Add**.\n\n" +
        "**Add a payment method (chat):** Ask the assistant, e.g. 'Add payment method Nubank'.\n\n" +
        "**Rename a payment method (UI):**\n" +
        "1. Settings → Payment Methods tab.\n" +
        "2. Click the **edit (pencil) icon** next to the method.\n" +
        "3. Change the name and click **Save**.\n\n" +
        "**Rename a payment method (chat):** Ask the assistant, e.g. 'Rename payment method Nubank to Nubank Crédito'. " +
        "The assistant will confirm the current name and ask for confirmation before renaming.\n\n" +
        "**Delete a payment method (UI):**\n" +
        "1. Settings → Payment Methods tab.\n" +
        "2. Click the **trash icon** next to it and confirm.\n\n" +
        "**Delete a payment method (chat):** Ask the assistant, e.g. 'Delete payment method Visa'.\n\n" +
        "**Reorder payment methods:**\n" +
        "- Drag and drop them in the list on the Settings → Payment Methods tab (UI only, not available via chat).",

      household:
        "**Managing household members:**\n\n" +
        "Household members let you track who pays for each subscription (e.g., family members).\n\n" +
        "**Add a member (UI):**\n" +
        "1. Settings → Household tab.\n" +
        "2. Enter the member's name.\n" +
        "3. Click **Add**.\n\n" +
        "**Add a member (chat):** Ask the assistant, e.g. 'Add household member Maria'.\n\n" +
        "**Rename a member (UI):**\n" +
        "1. Settings → Household tab.\n" +
        "2. Click the **edit (pencil) icon** next to the member.\n" +
        "3. Change the name and click **Save**.\n\n" +
        "**Rename a member (chat):** Ask the assistant, e.g. 'Rename household member João to João Silva'. " +
        "The assistant will confirm the current name and ask for confirmation before renaming.\n\n" +
        "**Assign a member to a subscription:**\n" +
        "1. Open the subscription edit form.\n" +
        "2. Set the **Payer** field to the household member.\n\n" +
        "**Delete a member (UI):**\n" +
        "1. Settings → Household tab.\n" +
        "2. Click the **trash icon** next to the member.\n\n" +
        "**Delete a member (chat):** Ask the assistant, e.g. 'Delete household member Maria'.",

      import_export:
        "**Import & Export:**\n\n" +
        "**Export subscriptions:**\n" +
        "- Subscriptions page → **Export** button → choose **JSON** or **XLSX**.\n" +
        "- JSON exports all fields; XLSX produces a formatted spreadsheet.\n\n" +
        "**Export calendar (iCal):**\n" +
        "- Calendar page → **Export iCal** → creates a feed URL for Google/Apple Calendar.\n" +
        "- Requires an API key with `calendar:read` permission.\n\n" +
        "**Import from Wallos or Zublo JSON:**\n" +
        "1. Subscriptions page → **Import** button → select a `.json` file.\n" +
        "2. Duplicate names are skipped automatically.\n" +
        "3. Missing categories, methods, currencies are auto-created.\n" +
        "4. Import summary shows how many were imported vs skipped.\n\n" +
        "**Import via chat (XLSX/CSV):**\n" +
        "- In the chat, click the paperclip icon and attach a spreadsheet.\n" +
        "- The AI shows a preview table and asks for confirmation before importing.\n\n" +
        "**JSON file format:**\n" +
        "Zublo format (snake_case): `name`, `price`, `currency_code`, `cycle_name` (Daily/Weekly/Monthly/Yearly), `frequency`, `next_payment` (YYYY-MM-DD), `start_date`, `category_name`, `payment_method_name`, `payer_name`, `notes`, `auto_renew`, `notify`, `inactive`.\n" +
        "Wallos format (PascalCase): `Name`, `Price`, `Currency`, `Cycle`, `Frequency`, `Next_Payment`, `Start_Date`, `Category`, `Payment_Method`, `Notes`, `Auto_Renew`, `Notify`, `Inactive`.",

      statistics:
        "**Statistics page (/statistics):**\n\n" +
        "**Summary cards:** monthly total, yearly total, active subscription count.\n\n" +
        "**Grouping options** (selector at top):\n" +
        "- **By category** (e.g., Streaming, Software, Health)\n" +
        "- **By payment method** (e.g., Nubank, PayPal)\n" +
        "- **By household member** (e.g., Daniel, Maria)\n\n" +
        "**Donut chart:** proportion of spending per group. Hover for value and percentage.\n\n" +
        "**12-month history chart:** monthly spending over time. Data comes from yearly_costs snapshots created by the cron job on the 1st of each month. If a month has no snapshot yet, the bar is missing.\n\n" +
        "**Breakdown table:** each group with color dot, name, percentage, and monthly value.\n\n" +
        "All amounts shown in main currency (converted using exchange rates if configured).",

      profile:
        "**Profile & account settings:**\n\n" +
        "Settings → Profile tab allows:\n" +
        "- **Avatar**: upload a photo (auto-compressed to 512px).\n" +
        "- **Username**: unique identifier.\n" +
        "- **Email**: account email address.\n" +
        "- **Monthly budget**: spending ceiling shown on dashboard. Enter amount → Save.\n" +
        "- **Language**: select English or Portuguese-BR → Save. Interface updates immediately.\n" +
        "- **Change password**: current password + new password (min 8 chars) + confirm → Save.\n\n" +
        "**Delete account** (irreversible):\n" +
        "1. Settings → Delete account tab.\n" +
        "2. Read the warning — all data is permanently deleted.\n" +
        "3. Type your email address in the confirmation field.\n" +
        "4. Click **Permanently delete account**.\n" +
        "Recovery is not possible after deletion.",

      admin:
        "**Admin panel** (admin-only, /admin):\n\n" +
        "Only the first registered user (admin) can access /admin.\n\n" +
        "**Users tab:** view all users, promote/demote admin, disable, delete accounts.\n\n" +
        "**Registration tab:**\n" +
        "- Enable/disable open registrations.\n" +
        "- Set maximum user count (0 = unlimited).\n" +
        "- Require email verification on signup.\n" +
        "- Set server URL (used in system emails).\n" +
        "- Disable all logins (except admin).\n" +
        "- Enable update notifications.\n\n" +
        "**SMTP tab** (required for email notifications and password reset):\n" +
        "- Host, Port, User, Password, From email, Display name, Encryption (None/TLS/STARTTLS).\n\n" +
        "**OIDC/SSO tab** (Single Sign-On):\n" +
        "- Enable OIDC, Provider name, Display name, Client ID, Client Secret, Issuer URL, Redirect URL, Scopes.\n" +
        "- Once configured, an SSO button appears on the login screen.\n\n" +
        "**Backup tab:**\n" +
        "- Click **Create backup** to download the full database.\n" +
        "- Click **Restore backup** to upload a backup file. Warning: restores replace ALL current data.\n\n" +
        "**Cronjobs tab** (manual execution):\n" +
        "- **check_subscriptions** — advances next_payment for auto-renew subscriptions (runs daily at midnight).\n" +
        "- **send_notifications** — dispatches payment reminders (runs hourly).\n" +
        "- **update_exchange_rates** — fetches latest rates from Fixer/APILayer (runs 2×/day).\n" +
        "- **save_monthly_costs** — creates yearly_costs snapshot for 12-month chart (runs 1st of month).\n" +
        "- **check_updates** — checks GitHub for new Zublo versions (runs weekly).\n\n" +
        "**Maintenance tab:** logo cleanup — removes orphaned logos not linked to any subscription.",

      ai:
        "**AI Chat & Recommendations:**\n\n" +
        "**Configure AI (Settings → AI tab):**\n" +
        "1. Enable the AI toggle.\n" +
        "2. Choose provider:\n" +
        "   - **Google Gemini** — native support, free tier available. Get key at aistudio.google.com.\n" +
        "   - **OpenAI** — GPT-4o, GPT-4, GPT-3.5. Get key at platform.openai.com.\n" +
        "   - **Ollama** — local/self-hosted models. Set base URL to your Ollama instance.\n" +
        "   - **OpenAI-compatible** — OpenRouter, Groq, Mistral, etc. Set custom base URL + key.\n" +
        "   - Anthropic Claude: use OpenRouter with an OpenAI-compatible setup.\n" +
        "3. Enter API key and click **Fetch models** to list available models (or type manually).\n" +
        "4. Save. The chat icon (/chat) appears in navigation.\n\n" +
        "**What the AI can do via chat:**\n" +
        "- Read and write subscriptions, categories, payment methods, household members, currencies.\n" +
        "- Generate spending reports and payment history.\n" +
        "- Import subscriptions from attached spreadsheets.\n" +
        "- Export subscriptions to JSON or XLSX.\n" +
        "- Rename categories in bulk.\n" +
        "- Generate AI saving recommendations.\n" +
        "- Provide step-by-step UI guidance for any feature.\n\n" +
        "**What the AI cannot do:**\n" +
        "- Upload files (avatars, logos, payment proof).\n" +
        "- Set main currency (must use UI star icon).\n" +
        "- Reorder payment methods (drag & drop only).\n" +
        "- Configure SMTP, OIDC, create/delete API keys.\n\n" +
        "**AI Recommendations (Dashboard):**\n" +
        "- Dashboard → AI Recommendations section → click **Generate**.\n" +
        "- AI analyzes active subscriptions and suggests money-saving tips (duplicates, cheaper alternatives, underused services).\n" +
        "- Delete individual recommendations with the trash icon.\n" +
        "- Regenerate anytime to refresh suggestions.\n\n" +
        "**Conversation management:**\n" +
        "- Sidebar groups conversations by: Today, Yesterday, Last 7 days, Last 30 days, Older.\n" +
        "- Hover a conversation to rename or delete it.\n" +
        "- Titles are AI-generated automatically on the first message.",

      dashboard:
        "**Dashboard:**\n\n" +
        "- Shows your **total monthly cost** (in main currency).\n" +
        "- Lists **upcoming payments** (subscriptions due in the next 7 days).\n" +
        "- Shows **overdue payments** if payment tracking is enabled.\n" +
        "- Displays **AI Recommendations** if AI is configured.\n" +
        "- Quick access to add a new subscription via the **+** button.",

      exchange_rates:
        "**Exchange Rates (automatic currency conversion):**\n\n" +
        "**Configure automatic rates:**\n" +
        "1. Go to Settings → Exchange Rates tab.\n" +
        "2. Enable the toggle.\n" +
        "3. Choose provider: **Fixer.io** (fixer.io) or **APILayer** (apilayer.com) — both have free tiers.\n" +
        "4. Enter your API key.\n" +
        "5. Click **Update now** to fetch rates immediately.\n" +
        "6. Save.\n\n" +
        "Rates update automatically **twice daily** (midnight and noon UTC).\n" +
        "The main currency always has rate = 1.0. All other currencies store their rate relative to it.\n\n" +
        "**Manual update:** Settings → Exchange Rates → **Update now** button.\n" +
        "**View last update:** shown on the Exchange Rates tab.",

      api_keys:
        "**API Keys (external integrations):**\n\n" +
        "API keys let external apps access your Zublo data without sharing your password.\n" +
        "Key format: `wk_...` — shown only once at creation. Maximum 20 keys per user.\n" +
        "For REST integrations, send the key in the `Authorization` header. Do not put API keys in query strings.\n\n" +
        "**Available permissions:**\n" +
        "- `subscriptions:read`, `subscriptions:write`\n" +
        "- `categories:read`, `categories:write`\n" +
        "- `payment_methods:read`, `payment_methods:write`\n" +
        "- `household:read`, `household:write`\n" +
        "- `currencies:read`, `currencies:write`\n" +
        "- `statistics:read`\n" +
        "- `calendar:read` (export iCal feed)\n\n" +
        "**Create a key:**\n" +
        "1. Settings → API Keys tab.\n" +
        "2. Click **+ New API Key**.\n" +
        "3. Give it a name and select permissions.\n" +
        "4. Click **Create API Key** — copy the key immediately, it won't be shown again.\n\n" +
        "**Edit a key:**\n" +
        "1. Settings → API Keys tab.\n" +
        "2. Click the **pencil (edit) icon** next to the key.\n" +
        "3. You can change the name and update permissions. The actual key remains the same.\n" +
        "4. Click **Save**.\n\n" +
        "**Delete a key:**\n" +
        "1. Settings → API Keys tab.\n" +
        "2. Click the **trash (delete) icon** (red color) and confirm.\n\n" +
        "**Use the key in REST requests:**\n" +
        "```\nAuthorization: Bearer wk_YOUR_KEY\n```\n\n" +
        "**API endpoints (categorized in UI):**\n" +
        "- **Subscriptions**: list all, get by ID, create, update, delete, status, mark paid, batch create.\n" +
        "- **Cycles**: list available billing cycles (Daily, Weekly, etc).\n" +
        "- **Categories, Payment Methods, Household, Currencies**: full CRUD available for each.\n" +
        "- **Stats**: get spending reports.\n" +
        "- **Calendar / iCal**: use the feed URL generated in the UI for calendar apps.\n\n" +
        "**Connect to Google Calendar / Apple Calendar:**\n" +
        "1. Create a key with `calendar:read` permission.\n" +
        "2. Settings → Calendar or API Keys → copy the generated iCal URL.\n" +
        "3. In your calendar app: Add from URL → paste the link.",

      theme:
        "**Theme & visual customization:**\n\n" +
        "Settings → Theme tab:\n" +
        "- **Color scheme:** Light / Dark / Auto (follows system).\n" +
        "- **Accent color:** click the color picker to change button/link colors.\n" +
        "- **Custom CSS:** paste any CSS rules to override the default styles.\n\n" +
        "Changes apply immediately on save.",

      display:
        "**Display preferences** (Settings → Display tab):\n\n" +
        "| Option | Effect |\n" +
        "|---|---|\n" +
        "| Convert to main currency | All prices shown in main currency using exchange rates |\n" +
        "| Show upcoming subscriptions | 'Coming soon' section on dashboard |\n" +
        "| Show inactive subscriptions | Cancelled subscriptions visible in list |\n" +
        "| Show logo background | White card behind logos |\n" +
        "| Logo background removal | Auto-remove white from logos |\n" +
        "| Small logo | Compact logo in subscription cards |\n" +
        "| Mobile navigation | Bottom nav bar on mobile devices |\n" +
        "| Monthly/Yearly toggle | Dashboard default view |\n\n" +
        "All toggles apply immediately.",

      "2fa":
        "**Two-Factor Authentication (2FA / TOTP):**\n\n" +
        "**Enable 2FA:**\n" +
        "1. Settings → 2FA tab.\n" +
        "2. Click **Enable 2FA**.\n" +
        "3. Scan the QR code with an authenticator app (Google Authenticator, Authy, Bitwarden, etc.).\n" +
        "4. Enter the 6-digit code to confirm.\n" +
        "5. **Save your backup codes** — they are the only recovery method if you lose your device.\n\n" +
        "**Login flow with 2FA enabled:**\n" +
        "1. Enter email and password on the login page.\n" +
        "2. Zublo creates a short-lived server-side login challenge.\n" +
        "3. Enter the 6-digit TOTP code or a backup code on the 2FA screen.\n" +
        "4. If the code is valid, Zublo issues the final authenticated session.\n" +
        "5. Optionally trust the current device for 30 days.\n\n" +
        "**Disable 2FA:**\n" +
        "1. Settings → 2FA tab.\n" +
        "2. Click **Disable 2FA** and confirm with your current TOTP code.\n\n" +
        "**Lost device:** use one of the backup codes generated during setup.",

      first_setup:
        "**First-time setup (new Zublo install):**\n\n" +
        "1. **Register** — open the Zublo URL. The first user to register becomes the admin.\n" +
        "2. **Set main currency** — Settings → Currencies → Add currency → click ⭐ next to it.\n" +
        "   Without a main currency, all dashboard totals show 0.\n" +
        "3. **Add categories** — Settings → Categories (e.g., Streaming, Software, Health).\n" +
        "4. **Add payment methods** — Settings → Payment Methods (e.g., Nubank, PayPal).\n" +
        "5. **Add household members** (optional) — Settings → Household.\n" +
        "6. **Add first subscription** — go to Subscriptions → + Add.\n" +
        "7. **Configure AI** (optional) — Settings → AI → choose provider → enter key → enable.\n" +
        "8. **Configure notifications** (optional) — Settings → Notifications → enable a channel → add reminder → enable Notify on subscriptions.\n" +
        "9. **Configure exchange rates** (optional, for multi-currency) — Settings → Exchange Rates → enter Fixer/APILayer key.\n" +
        "10. **Configure SMTP** (admin, for email) — /admin → Mail Settings.\n\n" +
        "**Docker quick start:**\n" +
        "```bash\ndocker run -d --name zublo -p 9597:9597 -v zublo_data:/pb/pb_data ghcr.io/danielalves96/zublo:latest\n```\n" +
        "Then open http://localhost:9597.",

      troubleshooting:
        "**Common problems and fixes:**\n\n" +
        "| Problem | Fix |\n" +
        "|---|---|\n" +
        "| Dashboard totals show 0 | Set main currency (Settings → Currencies → ⭐) AND enable 'Convert to main currency' (Settings → Display) |\n" +
        "| AI chat icon not visible | Settings → AI → configure a provider and enable it |\n" +
        "| Not receiving notifications | Check: (1) channel configured, (2) reminder added, (3) 'Notify' toggle ON on subscriptions |\n" +
        "| Exchange rates not updating | Settings → Exchange Rates → add Fixer.io or APILayer key |\n" +
        "| Can't register | Admin closed registration → ask admin to enable it at /admin |\n" +
        "| Forgot password | Requires SMTP configured by admin. If set up, use 'Forgot password' on login screen |\n" +
        "| Statistics 12-month chart empty | Chart builds over time (cron on 1st of month). Trigger manually: /admin → Cronjobs → save_monthly_costs |\n" +
        "| Import skipped subscriptions | Duplicates (same name) are automatically skipped — normal behavior |\n" +
        "| Can't delete payment method | Remove it from all subscriptions first |\n" +
        "| Can't delete main currency | Set another currency as main first |\n" +
        "| Lost 2FA device | Use backup codes saved during 2FA setup |",

      limitations:
        "**What the AI chat cannot do (UI-only actions):**\n\n" +
        "These require the web UI — the AI has no tools for them:\n" +
        "- Upload avatar, subscription logo, or payment proof (file upload)\n" +
        "- Set main currency (must click ⭐ in Settings → Currencies)\n" +
        "- Reorder payment methods (drag & drop only)\n" +
        "- Apply custom CSS or choose accent color (color picker)\n" +
        "- Scan 2FA QR code\n" +
        "- Download or restore backup\n" +
        "- Configure SMTP, OIDC/SSO (admin panel only)\n" +
        "- Create or delete API keys\n\n" +
        "**What Zublo does NOT have (features that don't exist):**\n" +
        "- Budget per category (one global monthly budget only)\n" +
        "- Income or expense tracking\n" +
        "- Bank/card sync or Open Banking\n" +
        "- Native mobile app (responsive web only)\n" +
        "- Offline/PWA mode\n" +
        "- Bulk edit or bulk delete subscriptions\n" +
        "- Spending forecasts\n" +
        "- Price change alerts\n" +
        "- Sub-categories\n" +
        "- Backup to S3 or external storage",

      multi_user:
        "**Multi-user instance behavior:**\n\n" +
        "- Each user's data is **fully isolated** — users cannot see each other's subscriptions, currencies, or settings.\n" +
        "- Categories, payment methods, currencies, household members, and AI settings are **per user**.\n" +
        "- Admin settings (SMTP, registration, OIDC) are **global** and affect all users.\n" +
        "- Cron jobs run for all users simultaneously.\n" +
        "- Household members are labels, not Zublo accounts.\n\n" +
        "**Admin capabilities (vs regular user):**\n" +
        "- Regular users: manage own subscriptions, settings, AI, notifications.\n" +
        "- Admin only: /admin panel, manage other users, SMTP, OIDC/SSO, backups, cron jobs, registration control.\n\n" +
        "**Invite other users:**\n" +
        "1. Admin goes to /admin → Registration tab.\n" +
        "2. Enable 'Open registrations' (and optionally set a max user count).\n" +
        "3. Share the Zublo URL — new users can register themselves.",

      calendar:
        "**Calendar page:**\n\n" +
        "- Shows all subscriptions on a monthly calendar by their `next_payment` date.\n" +
        "- **Colors:** green = paid, orange/red = overdue, normal = pending.\n" +
        "- Click any day to see a detail panel with that day's subscriptions.\n\n" +
        "**Mark as paid:**\n" +
        "1. Click the day with the payment.\n" +
        "2. Click **Mark as paid** on the subscription.\n" +
        "3. Optionally enter amount paid, notes, and upload a proof file (image or PDF).\n" +
        "4. Confirm.\n\n" +
        "**Undo payment:** click the paid subscription → **Undo payment**.\n\n" +
        "**Export to calendar app (Google Calendar, Apple Calendar):**\n" +
        "1. Click **Export iCal** on the calendar page.\n" +
        "2. If prompted, create an API key with `calendar:read` permission.\n" +
        "3. Copy the iCal URL and import it into your calendar app.",

      docker:
        "**Running Zublo with Docker (no docker-compose needed):**\n\n" +
        "```bash\ndocker run -d \\\n  --name zublo \\\n  -p 9597:9597 \\\n  -v zublo_data:/pb/pb_data \\\n  ghcr.io/danielalves96/zublo:latest\n```\n\n" +
        "Then open `http://localhost:9597` in your browser.\n\n" +
        "**What each flag does:**\n" +
        "- `-d` — run in background (detached mode).\n" +
        "- `--name zublo` — container name (use this in stop/rm commands).\n" +
        "- `-p 9597:9597` — expose port 9597. Change the left side to use a different host port (e.g., `-p 8080:9597`).\n" +
        "- `-v zublo_data:/pb/pb_data` — named volume for persistent data. **Never omit this** — without it all data is lost when the container stops.\n\n" +
        "**First run:** first user to register becomes the admin.\n\n" +
        "**Stop / remove:**\n" +
        "```bash\ndocker stop zublo\ndocker rm zublo\n```\n\n" +
        "**Update to latest version:**\n" +
        "```bash\ndocker pull ghcr.io/danielalves96/zublo:latest\ndocker stop zublo && docker rm zublo\n# then re-run the docker run command above\n```\n" +
        "Database migrations run automatically on startup — no manual steps needed.\n\n" +
        "**Run as specific user (optional):**\n" +
        "```bash\ndocker run -d \\\n  --name zublo \\\n  -p 9597:9597 \\\n  -v zublo_data:/pb/pb_data \\\n  -e PUID=1000 \\\n  -e PGID=1000 \\\n  ghcr.io/danielalves96/zublo:latest\n```\n\n" +
        "**Custom host port example (run on port 8080):**\n" +
        "```bash\ndocker run -d --name zublo -p 8080:9597 -v zublo_data:/pb/pb_data ghcr.io/danielalves96/zublo:latest\n```\n" +
        "Then open `http://localhost:8080`.\n\n" +
        "**With Docker Compose (`docker-compose.yml`):**\n" +
        "```yaml\nservices:\n  zublo:\n    image: ghcr.io/danielalves96/zublo:latest\n    container_name: zublo\n    restart: unless-stopped\n    ports:\n      - \"9597:9597\"\n    volumes:\n      - zublo_data:/pb/pb_data\n\nvolumes:\n  zublo_data:\n```\n" +
        "Run with: `docker compose up -d`\n" +
        "Stop with: `docker compose down`\n" +
        "Update: `docker compose pull && docker compose up -d`",

      authentication:
        "**Authentication flows:**\n\n" +
        "**Login:**\n" +
        "1. Go to /login.\n" +
        "2. Enter email and password → click Login.\n" +
        "3. If 2FA is enabled, you are redirected to /totp — enter the 6-digit code from your authenticator app.\n\n" +
        "**Register:**\n" +
        "1. Go to /register.\n" +
        "2. Fill in username, email, and password → Create account.\n" +
        "- Only available if admin enabled open registrations.\n" +
        "- Admin can set a maximum user count.\n\n" +
        "**Password reset:**\n" +
        "1. Login screen → click **Forgot password**.\n" +
        "2. Enter your email address.\n" +
        "3. Check your email for a reset link (requires SMTP configured by admin).\n" +
        "4. Follow the link and set a new password.\n\n" +
        "**SSO/OIDC login:**\n" +
        "- If admin configured an OIDC provider, an SSO button appears on the login screen.\n" +
        "- Click the provider button and authenticate via the external system.",

      glossary:
        "**Zublo glossary:**\n\n" +
        "- **Cycle**: billing period unit — Daily, Weekly, Monthly, or Yearly.\n" +
        "- **Frequency**: how many cycles between charges (default 1). Frequency=3 + Cycle=Monthly = quarterly billing.\n" +
        "- **Next payment**: date the next charge is expected. Advances automatically when payment is recorded.\n" +
        "- **Start date**: when the subscription began. Used for progress bars and history.\n" +
        "- **Payer**: household member assigned as responsible for a subscription. Used for cost-splitting reports.\n" +
        "- **User**: the Zublo account owner. Each user has fully isolated data.\n" +
        "- **Household member**: a person tracked for cost-splitting (e.g., family). Has no Zublo account — just a label.\n" +
        "- **Inactive**: subscription marked as cancelled/paused. Stays in history, excluded from totals.\n" +
        "- **Cancellation date**: optional date when an inactive subscription was/will be cancelled.\n" +
        "- **Replacement subscription**: links an old cancelled subscription to the new one that replaced it.\n" +
        "- **Auto-renew**: daily cron auto-marks subscription as paid on due date (no manual action needed).\n" +
        "- **Main currency**: base for all totals and conversions. Set via ⭐ in Settings → Currencies. Source of truth: `currencies.is_main = true`.\n" +
        "- **YearlyCosts snapshot**: monthly record created by cron on the 1st of each month. Powers the 12-month chart.\n" +
        "- **Payment record**: individual entry for a payment event — stores date, amount, notes, optional proof file.\n" +
        "- **API key**: scoped token (`wk_` prefix) for external integrations. Shown only once at creation.\n" +
        "- **Budget**: monthly spending ceiling set in Settings → Profile. Dashboard warns when exceeded.\n" +
        "- **is_main**: field on the currencies table marking which currency is the user's primary one.",

      security:
        "**Security features:**\n\n" +
        "**Two-Factor Authentication (2FA):**\n" +
        "- TOTP-based (works with Google Authenticator, Authy, Bitwarden, etc.).\n" +
        "- Setup: Settings → 2FA → Enable → scan QR code → confirm with 6-digit code.\n" +
        "- Backup codes are generated at setup — store them safely.\n" +
        "- Lost device: use a backup code to log in.\n\n" +
        "**API Keys:**\n" +
        "- Scoped permissions — only grant what's needed (principle of least privilege).\n" +
        "- Format: `wk_...` — shown only once at creation.\n" +
        "- Revoke at any time in Settings → API Keys → Delete.\n" +
        "- Maximum 20 keys per user.\n\n" +
        "**SSO/OIDC:**\n" +
        "- Configured by admin in /admin → OIDC tab.\n" +
        "- Supports any standard OIDC provider (Google, Azure AD, Okta, etc.).\n\n" +
        "**Data isolation:**\n" +
        "- Each user's data is fully isolated — no cross-user access.\n" +
        "- All data stored locally in SQLite — nothing sent to external services unless you configure integrations.",

      tools_reference:
        "**Complete AI tools reference:**\n\n" +
        "**Read-only tools:**\n" +
        "- `get_subscriptions(include_inactive)` — list all subscriptions.\n" +
        "- `get_subscription_details(name_or_id)` — full details of one subscription.\n" +
        "- `get_spending_report()` — monthly/yearly totals by category, method, member + budget.\n" +
        "- `get_currencies()` — all currencies with rates and is_main flag.\n" +
        "- `get_categories()` — all categories.\n" +
        "- `get_payment_methods()` — all payment methods.\n" +
        "- `get_household_members()` — all household members.\n" +
        "- `get_calendar(year, month)` — subscriptions due in that month.\n" +
        "- `get_upcoming_payments(days)` — due in next N days (default 30).\n" +
        "- `get_payment_history(subscription_name_or_id, limit)` — payment records.\n" +
        "- `get_ai_recommendations()` — existing saving tips.\n" +
        "- `get_app_help(topic)` — step-by-step UI instructions for any feature.\n" +
        "- `export_subscriptions(format)` — generate JSON or XLSX download.\n" +
        "- `check_permission()` — check if current user is admin.\n\n" +
        "**Write tools:**\n" +
        "- `create_subscription(name, price, cycle, currency_code, next_payment, [frequency, category_name, payment_method_name, payer_name, notes, notify, auto_renew, start_date])` — create subscription.\n" +
        "- `update_subscription(name_or_id, ...fields)` — edit any subscription field.\n" +
        "- `delete_subscription(name_or_id)` — permanently delete.\n" +
        "- `set_subscription_status(name_or_id, inactive, cancellation_date)` — cancel or reactivate.\n" +
        "- `mark_subscription_paid(name_or_id, paid_date)` — record payment.\n" +
        "- `batch_create_subscriptions(subscriptions[])` — bulk create from spreadsheet (after user confirmation).\n" +
        "- `create_category(name, color)` — add category.\n" +
        "- `update_category(old_name, new_name)` — rename category.\n" +
        "- `delete_category(name)` — delete category.\n" +
        "- `bulk_rename_categories(renames[{from, to}])` — rename multiple categories at once.\n" +
        "- `create_payment_method(name)` — add payment method.\n" +
        "- `rename_payment_method(old_name, new_name)` — rename payment method.\n" +
        "- `delete_payment_method(name)` — delete payment method.\n" +
        "- `create_household_member(name)` — add household member.\n" +
        "- `rename_household_member(old_name, new_name)` — rename household member.\n" +
        "- `delete_household_member(name)` — delete household member.\n" +
        "- `add_currency(code, name, symbol, rate)` — add currency.\n" +
        "- `set_main_currency(code_or_id)` — set main currency.\n" +
        "- `remove_currency(code_or_id)` — delete currency.\n" +
        "- `generate_ai_recommendations()` — call AI to generate saving tips.",

      field_validation:
        "**Field validation and constraints (for creating/editing data):**\n\n" +
        "**Subscriptions:**\n" +
        "- `name` — required, text, no uniqueness constraint (duplicates allowed).\n" +
        "- `price` — required, positive number.\n" +
        "- `next_payment` — required, ISO date `YYYY-MM-DD`.\n" +
        "- `cycle` — required, exactly one of: `Daily`, `Weekly`, `Monthly`, `Yearly` (case-sensitive).\n" +
        "- `frequency` — positive integer ≥ 1, default 1.\n" +
        "- `currency_code` — uppercase ISO 4217 (e.g., `BRL`, `USD`, `EUR`).\n\n" +
        "**Currencies:**\n" +
        "- `code` — uppercase ISO 4217.\n" +
        "- `rate` — positive float. Main currency rate = 1.0. All other rates are relative to it.\n\n" +
        "**Categories:**\n" +
        "- `color` — optional hex color, e.g., `#FF5733`.\n\n" +
        "**Household members / Payment methods:**\n" +
        "- `name` — required, must be unique per user.\n\n" +
        "**API keys:** maximum 20 per user.\n\n" +
        "**Notification reminders:**\n" +
        "- `days` — integer 0–365 (0 = same day as due date).\n" +
        "- `hour` — integer 0–23.\n\n" +
        "**Rule:** if a required field is missing from the user's message, ask for it before calling any tool. Never use placeholder values."
    };
    return { topic: topic, content: help[topic] || help.general };
  }

  function executeTool(name, uid, args, adminFlag) {
    switch (name) {
      case "get_subscriptions": return executeTool_get_subscriptions(uid);
      case "update_subscription": return executeTool_update_subscription(uid, args);
      case "delete_subscription": return executeTool_delete_subscription(uid, args);
      case "set_subscription_status": return executeTool_set_subscription_status(uid, args);
      case "get_spending_report": return executeTool_get_spending_report(uid, args);
      case "get_payment_history": return executeTool_get_payment_history(uid, args);
      case "create_subscription": return executeTool_create_subscription(uid, args);
      case "get_categories": return executeTool_get_categories(uid);
      case "create_category": return executeTool_create_category(uid, args);
      case "update_category": return executeTool_update_category(uid, args);
      case "delete_category": return executeTool_delete_category(uid, args);
      case "bulk_rename_categories": return executeTool_bulk_rename_categories(uid, args);
      case "export_subscriptions": return executeTool_export_subscriptions(uid, args);
      case "batch_create_subscriptions": return executeTool_batch_create_subscriptions(uid, args);
      case "get_payment_methods": return executeTool_get_payment_methods(uid);
      case "create_payment_method": return executeTool_create_payment_method(uid, args);
      case "rename_payment_method": return executeTool_rename_payment_method(uid, args);
      case "delete_payment_method": return executeTool_delete_payment_method(uid, args);
      case "get_household_members": return executeTool_get_household_members(uid);
      case "create_household_member": return executeTool_create_household_member(uid, args);
      case "rename_household_member": return executeTool_rename_household_member(uid, args);
      case "delete_household_member": return executeTool_delete_household_member(uid, args);
      case "get_currencies": return executeTool_get_currencies(uid);
      case "add_currency": return executeTool_add_currency(uid, args);
      case "set_main_currency": return executeTool_set_main_currency(uid, args);
      case "remove_currency": return executeTool_remove_currency(uid, args);
      case "check_permission": return executeTool_check_permission(adminFlag);
      case "get_app_help": return executeTool_get_app_help(args);
      default: return { error: "Unknown tool: " + name };
    }
  }

  // ── AI settings ────────────────────────────────────────────────

  var aiSettings;
  try {
    var settingsRecs = $app.findRecordsByFilter(
      "ai_settings", "user = {:userId} && enabled = true", "", 1, 0, { userId: userId }
    );
    if (settingsRecs.length === 0) return e.json(400, { error: "AI not configured or disabled" });
    aiSettings = settingsRecs[0];
  } catch (_) {
    return e.json(400, { error: "AI settings not found" });
  }

  var rawUrl = (aiSettings.get("url") || "").replace(/\/$/, "");
  if (!rawUrl) return e.json(400, { error: "AI provider URL not configured" });

  // ── User language & main currency ─────────────────────────────

  var language = "en";
  var mainCurrencyCode = "";
  var mainCurrencySymbol = "";
  try {
    var userRec2 = $app.findRecordById("users", userId);
    language = userRec2.get("language") || "en";

    // Primary source: currencies table where is_main = true (same source the UI uses)
    try {
      var mainCurs = $app.findRecordsByFilter(
        "currencies", "user = {:userId} && is_main = true", "", 1, 0, { userId: userId }
      );
      if (mainCurs.length > 0) {
        mainCurrencyCode = mainCurs[0].get("code") || "";
        mainCurrencySymbol = mainCurs[0].get("symbol") || "";
        // Self-heal: keep users.main_currency in sync with the currencies table
        if (userRec2.get("main_currency") !== mainCurs[0].id) {
          try {
            userRec2.set("main_currency", mainCurs[0].id);
            $app.save(userRec2);
          } catch (_) { }
        }
      }
    } catch (_) { }

    // Fallback: if no is_main currency found, try users.main_currency field
    if (!mainCurrencyCode) {
      var mainCurId = userRec2.get("main_currency");
      if (mainCurId) {
        try {
          var mainCurRec = $app.findRecordById("currencies", mainCurId);
          mainCurrencyCode = mainCurRec.get("code") || "";
          mainCurrencySymbol = mainCurRec.get("symbol") || "";
        } catch (_) { }
      }
    }
  } catch (_) { }

  var LANGUAGE_NAMES = {
    "en": "English",
    "pt_BR": "Brazilian Portuguese",
    "de": "German",
    "es": "Spanish",
    "fr": "French",
    "it": "Italian",
    "nl": "Dutch",
    "pl": "Polish",
    "ru": "Russian",
    "zh_CN": "Simplified Chinese",
    "ja": "Japanese",
    "ko": "Korean",
    "tr": "Turkish",
    "uk": "Ukrainian",
    "cs": "Czech",
    "da": "Danish"
  };
  var languageName = LANGUAGE_NAMES[language] || language;

  // ── Optional product knowledge base (LLMS.md) ────────────────
  // Best-effort load. If unavailable, continue with built-in prompt.
  var llmsDoc = "";
  try {
    llmsDoc = String($os.readFile("LLMS.md") || "");
  } catch (_) {
    llmsDoc = "";
  }

  // ── System prompt ──────────────────────────────────────────────

  var today = new Date().toISOString().split("T")[0];
  var systemPrompt =
    "You are the Zublo Assistant — a comprehensive expert on the Zublo subscription management app and a proactive financial assistant.\n\n" +
    "Today's date: " + today + "\n" +
    "## CRITICAL: Language\n" +
    "The user's language is **" + languageName + "** (locale code: " + language + ").\n" +
    "You MUST write EVERY response — including confirmations, questions, summaries, and error messages — exclusively in " + languageName + ".\n" +
    "Never respond in English unless the user's language is English. This rule has no exceptions.\n\n" +
    "User is admin: " + (isAdmin ? "YES" : "NO") + "\n" +
    "User's main currency: " + (mainCurrencyCode ? mainCurrencyCode + " (" + mainCurrencySymbol + ")" : "not set") + " — use this as the default currency for all suggestions, previews, and new subscriptions unless the user specifies otherwise.\n\n" +

    "## Your capabilities\n" +
    "You can directly read and write data in Zublo using tools:\n" +
    "- **Subscriptions**: list, create, update, delete, activate/deactivate\n" +
    "- **Categories**: list, create, rename, delete\n" +
    "- **Payment Methods**: list, create, delete\n" +
    "- **Household Members**: list, create, delete\n" +
    "- **Currencies**: list, add, set as main, remove\n" +
    "- **Reports**: spending by period, payment history\n" +
    "- **Export**: generate a JSON or XLSX file download of all subscriptions\n" +
    "- **Bulk operations**: rename/translate multiple categories at once\n" +
    "- **Help**: step-by-step guidance for any UI feature\n\n" +

    "## Permission rules\n" +
    "- Any authenticated user can manage their OWN data (subscriptions, categories, currencies, etc.).\n" +
    "- Admin-only actions: managing other users, SMTP settings, OIDC/SSO, registration settings, backups, cron jobs, maintenance.\n" +
    "- If the user asks about an admin-only feature AND 'User is admin: NO', respond: explain the feature is admin-only, and tell them to ask their Zublo administrator.\n" +
    "- If 'User is admin: YES', you can guide them through admin panel actions step by step.\n" +
    "- Use the `check_permission` tool when the user explicitly asks about their access level.\n\n" +

    "## Behavioral rules\n" +
    "- ALWAYS call `get_subscriptions` before answering questions about the user's subscriptions.\n" +
    "- ALWAYS call `get_spending_report` for spending/cost questions.\n" +
    "- For UI/how-to questions (where to click, where to configure, how to set), call `get_app_help` with the most relevant topic before answering.\n" +
    "- NEVER claim a feature does not exist unless you first call `get_app_help` and verify the topic content does not include that feature.\n" +
    "- For CREATE/UPDATE/DELETE operations: collect all required info, present a clear summary, and ask for confirmation BEFORE calling the tool.\n" +
    "- For destructive actions (delete): always confirm explicitly ('Are you sure you want to delete X? This cannot be undone.').\n" +
    "- For `bulk_rename_categories`: ALWAYS call `get_categories` first to get the EXACT stored names. Use those exact names in the `renames` array — never invent or guess category names.\n" +
    "- For `export_subscriptions`: call it directly without asking for confirmation — the user has already requested it.\n" +
    "- For `batch_create_subscriptions`: ONLY call after showing the user a full preview and receiving explicit confirmation. Pass ALL subscriptions in a single call — never loop calling `create_subscription` individually for spreadsheet imports.\n\n" +

    "## Spreadsheet import expertise\n" +
    "When the user's message contains [PLANILHA ANEXADA: ...] with a JSON block:\n" +
    "1. INSPECT the JSON carefully — each object is a spreadsheet row.\n" +
    "2. MAP columns to Zublo fields using smart inference (Portuguese and English column names):\n" +
    "   - name/nome/serviço/service/título/description → **name** (REQUIRED)\n" +
    "   - valor/price/preço/amount/custo/value/mensalidade → **price** (REQUIRED, number)\n" +
    "   - moeda/currency/divisa → **currency_code** (REQUIRED, ISO 4217: R$/BRL, $/USD, €/EUR)\n" +
    "   - ciclo/cycle/período/billing/recorrência → **cycle** (REQUIRED: Daily/Weekly/Monthly/Yearly)\n" +
    "   - frequência/frequency/every/cada → **frequency** (integer, default 1)\n" +
    "   - próximo pagamento/next payment/vencimento/due date/data → **next_payment** (YYYY-MM-DD)\n" +
    "   - categoria/category/tipo/type/tag/grupo → **category_name**\n" +
    "   - método/payment method/forma de pagamento/cartão → **payment_method_name**\n" +
    "   - notas/notes/obs/observações/descrição → **notes**\n" +
    "   - url/site/link/website → **url**\n" +
    "3. NORMALIZE values:\n" +
    "   - Dates: convert any format to YYYY-MM-DD (dd/mm/yyyy, mm/dd/yyyy, 'Jan 2024', etc.)\n" +
    "   - Currency symbols to codes: R$ → BRL, $ → USD, € → EUR, £ → GBP\n" +
    "   - Cycle names: mensal/monthly → Monthly, anual/yearly → Yearly, semanal/weekly → Weekly, diário/daily → Daily\n" +
    "   - Prices: remove currency symbols, convert commas to dots (e.g. '55,90' → 55.90)\n" +
    "4. SHOW a formatted preview table: | Nome | Preço | Moeda | Ciclo | Próx. Pagamento | Categoria |\n" +
    "5. FLAG issues: missing required fields, ambiguous columns, unrecognized values — suggest fixes.\n" +
    "6. If next_payment is missing, suggest today's date or ask the user.\n" +
    "7. ASK: 'Está correto? Quer fazer alguma alteração antes de importar?'\n" +
    "8. ONLY call `batch_create_subscriptions` after the user explicitly confirms.\n" +
    "9. If you cannot parse the data at all (corrupted, non-subscription content, too ambiguous), say so clearly and explain what information is needed.\n" +
    "- If information is missing, ask follow-up questions.\n" +
    "- For actions requiring file uploads (payment proof, avatar, logo, import) or drag-and-drop (payment method reorder): use `get_app_help` and provide the step-by-step UI instructions — you cannot do these directly.\n" +
    "- Format responses with markdown (lists, bold, tables) for clarity.\n" +
    "- When creating/editing, check related data first (e.g., call `get_currencies` to confirm a currency exists before creating a subscription with it).\n" +
    "- After a successful mutation, briefly confirm what was done and suggest what the user might want to do next." +
    (llmsDoc
      ? "\n\n## Product knowledge base (LLMS.md)\n" +
      "Use the following as source-of-truth product documentation when answering feature and navigation questions:\n\n" +
      llmsDoc
      : "");

  // ── Build message history ──────────────────────────────────────
  // When conversation_id is supplied, load the persisted history from DB
  // so the AI has full context. The `messages` array in the request then
  // contains only the NEW user message.

  var chatMessages = [{ role: "system", content: systemPrompt }];

  if (conversationId) {
    try {
      var historyRecs = [];
      try {
        historyRecs = $app.findRecordsByFilter(
          "chat_messages", "conversation = {:cid}", "+created_at", 0, 0, { cid: conversationId }
        );
      } catch (_) {
        historyRecs = $app.findRecordsByFilter(
          "chat_messages", "conversation = {:cid}", "", 0, 0, { cid: conversationId }
        );
      }

      historyRecs.sort(function (a, b) {
        var ac = a.get("created_at") || "";
        var bc = b.get("created_at") || "";
        if (ac === bc) return 0;
        return ac < bc ? -1 : 1;
      });

      for (var hi = 0; hi < historyRecs.length; hi++) {
        var h = historyRecs[hi];
        chatMessages.push({ role: h.get("role"), content: h.get("content") || "" });
      }
    } catch (_) { }
  }

  for (var mi = 0; mi < messages.length; mi++) {
    var m = messages[mi];
    if (m.role === "user" || m.role === "assistant") {
      chatMessages.push({ role: m.role, content: m.content || "" });
    }
  }

  // ── Tool definitions ───────────────────────────────────────────

  var TOOLS = [
    {
      type: "function",
      function: {
        name: "get_subscriptions",
        description: "Returns all subscriptions (active and inactive) for the user. ALWAYS call this before answering questions about the user's subscriptions.",
        parameters: { type: "object", properties: {}, required: [] }
      }
    },
    {
      type: "function",
      function: {
        name: "create_subscription",
        description: "Creates a new subscription. IMPORTANT: Collect all required fields, present a summary, and ask for user confirmation BEFORE calling this tool.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Subscription name" },
            price: { type: "number", description: "Billing price" },
            currency_code: { type: "string", description: "ISO 4217 code e.g. BRL, USD, EUR" },
            cycle: { type: "string", enum: ["Daily", "Weekly", "Monthly", "Yearly"] },
            frequency: { type: "integer", description: "Cycles between payments. Default 1.", default: 1 },
            next_payment: { type: "string", description: "Next payment date YYYY-MM-DD" },
            category_name: { type: "string", description: "Category name (created automatically if doesn't exist)" },
            payment_method_name: { type: "string", description: "Exact payment method name (must exist)" },
            notes: { type: "string" },
            url: { type: "string" },
            notify: { type: "boolean", description: "Enable payment notifications" }
          },
          required: ["name", "price", "currency_code", "cycle", "next_payment"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_subscription",
        description: "Updates fields of an existing subscription found by name. Only provided fields are changed. ALWAYS confirm with the user before calling.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Current subscription name (partial match)" },
            new_name: { type: "string", description: "New name to rename it to" },
            price: { type: "number", description: "New billing price" },
            currency_code: { type: "string", description: "New currency ISO code" },
            cycle: { type: "string", enum: ["Daily", "Weekly", "Monthly", "Yearly"] },
            frequency: { type: "integer" },
            next_payment: { type: "string", description: "New next payment date YYYY-MM-DD" },
            category_name: { type: "string", description: "New category name (empty string to clear)" },
            payment_method_name: { type: "string", description: "New payment method name (empty string to clear)" },
            notes: { type: "string" },
            url: { type: "string" },
            notify: { type: "boolean" },
            auto_renew: { type: "boolean" }
          },
          required: ["name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "delete_subscription",
        description: "Permanently deletes a subscription by exact name. ALWAYS ask for explicit confirmation before calling. This cannot be undone.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Exact subscription name to delete" }
          },
          required: ["name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "set_subscription_status",
        description: "Marks a subscription as active or inactive (paused). Confirm before calling.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Subscription name (partial match)" },
            inactive: { type: "boolean", description: "true = pause/deactivate, false = reactivate" }
          },
          required: ["name", "inactive"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_spending_report",
        description: "Returns monthly spending totals. Use for any question about how much the user spends or has spent.",
        parameters: {
          type: "object",
          properties: {
            period: {
              type: "string",
              enum: ["current_month", "last_3_months", "last_6_months", "last_12_months", "current_year"],
              description: "Time window. Defaults to last_6_months."
            }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_payment_history",
        description: "Returns payment records showing paid and missed payments.",
        parameters: {
          type: "object",
          properties: {
            subscription_name: { type: "string", description: "Optional. Filter by subscription name." },
            limit: { type: "integer", description: "Max records to return. Default 20.", default: 20 }
          },
          required: []
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_categories",
        description: "Returns all categories the user has created.",
        parameters: { type: "object", properties: {}, required: [] }
      }
    },
    {
      type: "function",
      function: {
        name: "create_category",
        description: "Creates a new subscription category. Confirm with user before calling.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Category name (e.g., Entertainment, Work, Health)" }
          },
          required: ["name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_category",
        description: "Renames an existing category. Confirm before calling.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Current category name (exact)" },
            new_name: { type: "string", description: "New category name" }
          },
          required: ["name", "new_name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "delete_category",
        description: "Deletes a category. Subscriptions in this category will become uncategorized. Confirm before calling.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Exact category name to delete" }
          },
          required: ["name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_payment_methods",
        description: "Returns all payment methods the user has created.",
        parameters: { type: "object", properties: {}, required: [] }
      }
    },
    {
      type: "function",
      function: {
        name: "create_payment_method",
        description: "Creates a new payment method. Confirm before calling.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Payment method name (e.g., Visa, PayPal, Nubank)" }
          },
          required: ["name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "rename_payment_method",
        description: "Renames an existing payment method. Call get_payment_methods first to get the exact current name. Confirm before calling.",
        parameters: {
          type: "object",
          properties: {
            old_name: { type: "string", description: "Current exact name of the payment method" },
            new_name: { type: "string", description: "New name for the payment method" }
          },
          required: ["old_name", "new_name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "delete_payment_method",
        description: "Deletes a payment method. Confirm before calling.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Exact payment method name" }
          },
          required: ["name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_household_members",
        description: "Returns all household members the user has added.",
        parameters: { type: "object", properties: {}, required: [] }
      }
    },
    {
      type: "function",
      function: {
        name: "create_household_member",
        description: "Adds a new household member. Confirm before calling.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Household member name" }
          },
          required: ["name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "rename_household_member",
        description: "Renames an existing household member. Call get_household_members first to get the exact current name. Confirm before calling.",
        parameters: {
          type: "object",
          properties: {
            old_name: { type: "string", description: "Current exact name of the household member" },
            new_name: { type: "string", description: "New name for the household member" }
          },
          required: ["old_name", "new_name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "delete_household_member",
        description: "Removes a household member. Confirm before calling.",
        parameters: {
          type: "object",
          properties: {
            name: { type: "string", description: "Exact household member name" }
          },
          required: ["name"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "get_currencies",
        description: "Returns all currencies the user has added, including which is the main currency.",
        parameters: { type: "object", properties: {}, required: [] }
      }
    },
    {
      type: "function",
      function: {
        name: "add_currency",
        description: "Adds a new currency. Confirm before calling.",
        parameters: {
          type: "object",
          properties: {
            code: { type: "string", description: "ISO 4217 currency code (e.g., BRL, USD, EUR)" },
            symbol: { type: "string", description: "Currency symbol (e.g., R$, $, €)" },
            name: { type: "string", description: "Optional full name (e.g., Brazilian Real)" }
          },
          required: ["code", "symbol"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "set_main_currency",
        description: "Sets a currency as the main/primary currency. All totals will be converted to it. Confirm before calling.",
        parameters: {
          type: "object",
          properties: {
            code: { type: "string", description: "ISO 4217 currency code to set as main" }
          },
          required: ["code"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "remove_currency",
        description: "Removes a currency. Cannot remove the main currency. Confirm before calling.",
        parameters: {
          type: "object",
          properties: {
            code: { type: "string", description: "ISO 4217 currency code to remove" }
          },
          required: ["code"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "batch_create_subscriptions",
        description: "Creates multiple subscriptions at once from a spreadsheet analysis. ONLY call this after presenting a full preview table and receiving explicit user confirmation. Each subscription must have all required fields filled (including next_payment as YYYY-MM-DD).",
        parameters: {
          type: "object",
          properties: {
            subscriptions: {
              type: "array",
              description: "Array of subscription objects to create",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  price: { type: "number" },
                  currency_code: { type: "string", description: "ISO 4217 e.g. BRL, USD, EUR" },
                  cycle: { type: "string", enum: ["Daily", "Weekly", "Monthly", "Yearly"] },
                  frequency: { type: "integer", default: 1 },
                  next_payment: { type: "string", description: "YYYY-MM-DD" },
                  category_name: { type: "string" },
                  payment_method_name: { type: "string" },
                  notes: { type: "string" },
                  url: { type: "string" }
                },
                required: ["name", "price", "currency_code", "cycle", "next_payment"]
              }
            }
          },
          required: ["subscriptions"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "bulk_rename_categories",
        description: "Renames multiple categories at once in a single operation. Use this when the user wants to rename or translate several categories simultaneously. ALWAYS call get_categories first, present the full rename plan, and ask for confirmation before calling.",
        parameters: {
          type: "object",
          properties: {
            renames: {
              type: "array",
              description: "List of rename operations",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Current exact category name" },
                  new_name: { type: "string", description: "New name to use" }
                },
                required: ["name", "new_name"]
              }
            }
          },
          required: ["renames"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "export_subscriptions",
        description: "Exports all user subscriptions as JSON or XLSX. The frontend will automatically trigger a file download. Use when the user asks to export, download, or get a backup of their subscriptions.",
        parameters: {
          type: "object",
          properties: {
            format: {
              type: "string",
              enum: ["json", "xlsx"],
              description: "Export format. 'json' for a JSON file, 'xlsx' for an Excel spreadsheet."
            }
          },
          required: ["format"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "check_permission",
        description: "Checks if the current user has admin privileges. Use when the user asks what they can do or whether they have admin access.",
        parameters: { type: "object", properties: {}, required: [] }
      }
    },
    {
      type: "function",
      function: {
        name: "get_app_help",
        description: "Returns step-by-step UI instructions and detailed knowledge for any Zublo feature or topic. Use for how-to questions, troubleshooting, feature questions, or when a task requires file uploads/UI interactions that can't be done via tools.",
        parameters: {
          type: "object",
          properties: {
            topic: {
              type: "string",
              enum: ["general", "subscriptions", "payment_tracking", "notifications", "categories", "currencies", "payment_methods", "household", "import_export", "statistics", "profile", "admin", "ai", "dashboard", "exchange_rates", "api_keys", "theme", "display", "2fa", "first_setup", "troubleshooting", "limitations", "multi_user", "calendar", "authentication", "glossary", "security", "tools_reference", "docker", "field_validation"],
              description: "The help topic. Use 'docker' for Docker/self-hosting/installation questions, 'first_setup' for new users, 'troubleshooting' for problems, 'limitations' for what AI/Zublo can't do, 'multi_user' for multi-user questions, 'glossary' for term definitions, 'tools_reference' for the complete list of AI tools, 'authentication' for login/register/SSO/password reset, 'security' for 2FA/API keys/OIDC."
            }
          },
          required: ["topic"]
        }
      }
    }
  ];

  // ── Agentic loop (max 8 iterations) ───────────────────────────

  var MAX_ITERATIONS = 15;
  var actions_taken = [];
  var finalText = "";

  // Mutation tools that should trigger UI refresh
  var MUTATION_TOOLS = {
    "create_subscription": "subscription",
    "update_subscription": "subscription",
    "delete_subscription": "subscription",
    "set_subscription_status": "subscription",
    "create_category": "category",
    "update_category": "category",
    "delete_category": "category",
    "create_payment_method": "payment_method",
    "rename_payment_method": "payment_method",
    "delete_payment_method": "payment_method",
    "create_household_member": "household",
    "rename_household_member": "household",
    "delete_household_member": "household",
    "add_currency": "currency",
    "set_main_currency": "currency",
    "remove_currency": "currency",
    "bulk_rename_categories": "category",
    "export_subscriptions": "export",
    "batch_create_subscriptions": "subscription"
  };

  try {
    for (var iter = 0; iter < MAX_ITERATIONS; iter++) {
      var result = callAI(aiSettings, chatMessages, TOOLS);

      if (result.tool_calls && result.tool_calls.length > 0) {
        var formattedCalls = [];
        for (var tci = 0; tci < result.tool_calls.length; tci++) {
          var tc = result.tool_calls[tci];
          formattedCalls.push({
            id: tc.id,
            type: "function",
            function: { name: tc.name, arguments: JSON.stringify(tc.arguments) }
          });
        }
        var assistantMsg = { role: "assistant", content: null, tool_calls: formattedCalls };
        if (result.reasoning_content) assistantMsg.reasoning_content = result.reasoning_content;
        chatMessages.push(assistantMsg);

        var batchImportDone = false;
        for (var tri = 0; tri < result.tool_calls.length; tri++) {
          var tc2 = result.tool_calls[tri];
          var toolResult = executeTool(tc2.name, userId, tc2.arguments, isAdmin);
          chatMessages.push({
            role: "tool",
            tool_call_id: tc2.id,
            name: tc2.name,
            content: JSON.stringify(toolResult)
          });
          if (MUTATION_TOOLS[tc2.name] && (toolResult.success || toolResult.import_complete)) {
            actions_taken.push({
              tool: tc2.name,
              type: MUTATION_TOOLS[tc2.name],
              result: toolResult
            });
          }
          // After a batch import completes, break out of the loop immediately
          // to prevent the AI from re-calling creation tools in the next iteration.
          if (tc2.name === "batch_create_subscriptions" && toolResult.import_complete) {
            batchImportDone = true;
          }
        }
        if (batchImportDone) break;
        continue;
      }

      finalText = result.text || "";
      break;
    }

    // If the loop ended on a tool call with no follow-up text (e.g. after a batch
    // import break), nudge the AI to produce a summary in the user's language.
    // Pass an empty tools array so it MUST reply with text — no more tool calls.
    if (!finalText) {
      // Build a context hint from actions_taken so the summary is accurate
      var nudgeContext = "";
      for (var na = 0; na < actions_taken.length; na++) {
        var ar = actions_taken[na].result;
        if (ar && ar.message) { nudgeContext += ar.message + " "; }
      }
      try {
        chatMessages.push({
          role: "user",
          content: "Responda em " + languageName + " com um resumo claro do que foi feito." +
            (nudgeContext ? " Contexto: " + nudgeContext.trim() : "")
        });
        var summaryResult = callAI(aiSettings, chatMessages, []);
        finalText = summaryResult.text || "";
      } catch (nudgeErr) {
        // Last-resort: build a minimal summary from actions_taken
        if (actions_taken.length > 0) {
          var names = [];
          for (var ai2 = 0; ai2 < actions_taken.length; ai2++) {
            var r = actions_taken[ai2].result;
            if (r && r.name) names.push(r.name);
            else if (r && r.created_names) {
              for (var cn = 0; cn < r.created_names.length; cn++) names.push(r.created_names[cn]);
            }
          }
          finalText = "✓ " + actions_taken.length + " action(s) completed." + (names.length > 0 ? " (" + names.join(", ") + ")" : "");
        } else {
          finalText = "✓";
        }
      }
    }

    // ── Persist conversation & messages ─────────────────────────
    // Store the display version of the user message (no JSON blobs) + assistant response.
    try {
      // Ensure collections exist (self-healing in case onBootstrap missed them)
      var convCol2, msgCol2;
      try { convCol2 = $app.findCollectionByNameOrId("chat_conversations"); }
      catch (_) {
        try {
          $app.importCollections([
            {
              name: "chat_conversations", type: "base", listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
              fields: [
                { name: "user", type: "text", required: true },
                { name: "title", type: "text", required: false },
                { name: "created_at", type: "date", required: false },
                { name: "updated_at", type: "date", required: false }
              ]
            },
            {
              name: "chat_messages", type: "base", listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
              fields: [
                { name: "conversation", type: "text", required: true },
                { name: "role", type: "text", required: true },
                { name: "content", type: "text", required: false },
                { name: "created_at", type: "date", required: false }
              ]
            }
          ], false);
        } catch (_) {
          try { var _c1 = new Collection({ name: "chat_conversations", type: "base", fields: [{ name: "user", type: "text" }, { name: "title", type: "text" }, { name: "created_at", type: "date" }, { name: "updated_at", type: "date" }] }); $app.save(_c1); } catch (_) { }
          try { var _c2 = new Collection({ name: "chat_messages", type: "base", fields: [{ name: "conversation", type: "text" }, { name: "role", type: "text" }, { name: "content", type: "text" }, { name: "created_at", type: "date" }] }); $app.save(_c2); } catch (_) { }
        }
        convCol2 = $app.findCollectionByNameOrId("chat_conversations");
      }
      msgCol2 = $app.findCollectionByNameOrId("chat_messages");

      function colHasField(col, fieldName) {
        if (!col || !col.fields) return false;
        for (var fi = 0; fi < col.fields.length; fi++) {
          if (col.fields[fi].name === fieldName) return true;
        }
        return false;
      }

      var convHasCreatedAt = colHasField(convCol2, "created_at");
      var convHasUpdatedAt = colHasField(convCol2, "updated_at");
      var msgHasCreatedAt = colHasField(msgCol2, "created_at");

      var nowIso = new Date().toISOString();

      // Resolve display content: prefer explicit display_message, fall back to
      // last user message content (truncated so we never store huge JSON blobs).
      var storedUserContent = displayMessage;
      if (!storedUserContent) {
        for (var lm = messages.length - 1; lm >= 0; lm--) {
          if (messages[lm].role === "user") {
            storedUserContent = String(messages[lm].content || "").substring(0, 2000);
            break;
          }
        }
      }
      storedUserContent = storedUserContent || "";
      var convTitle = null;

      if (!conversationId) {
        // Generate a concise AI title using the same callAI helper (best-effort)
        convTitle = "";
        try {
          var rawMsgForTitle = storedUserContent
            .replace(/\[planilha:[^\]]*\]/g, "")
            .replace(/\[PLANILHA ANEXADA:[^\]]*\]/g, "")
            .replace(/```[\s\S]*?```/g, "[spreadsheet data]")
            .trim()
            .substring(0, 400);

          if (rawMsgForTitle) {
            var titleMessages = [{
              role: "user",
              content: "Generate a short, concise title (maximum 5 words) for a conversation that starts with the following message. " +
                "Reply with ONLY the title — no quotes, no punctuation at the end, no explanation. " +
                "Use the same language as the message.\n\nMessage: " + rawMsgForTitle
            }];
            var titleResult = callAI(aiSettings, titleMessages, []);
            if (titleResult && titleResult.text) {
              convTitle = titleResult.text.replace(/^["']|["']$/g, "").trim();
            }
          }
        } catch (_) {}

        // Fallback to truncated user message
        if (!convTitle) {
          convTitle = storedUserContent
            .replace(/\[planilha:[^\]]*\]/g, "")
            .replace(/\[PLANILHA ANEXADA:[^\]]*\]/g, "")
            .trim()
            .substring(0, 80);
        }
        if (!convTitle) convTitle = "New Conversation";

        var convRec2 = new Record(convCol2);
        convRec2.set("user", userId);
        convRec2.set("title", convTitle);
        if (convHasCreatedAt) convRec2.set("created_at", nowIso);
        if (convHasUpdatedAt) convRec2.set("updated_at", nowIso);
        $app.save(convRec2);
        conversationId = convRec2.id;
      } else {
        // Bump the updated timestamp so the sidebar re-orders correctly
        try {
          var touchRec = $app.findRecordById("chat_conversations", conversationId);
          if (convHasUpdatedAt) touchRec.set("updated_at", nowIso);
          $app.save(touchRec);
        } catch (_) { }
      }

      var userMsgRec = new Record(msgCol2);
      userMsgRec.set("conversation", conversationId);
      userMsgRec.set("role", "user");
      userMsgRec.set("content", storedUserContent);
      if (msgHasCreatedAt) userMsgRec.set("created_at", nowIso);
      $app.save(userMsgRec);

      var asstMsgRec = new Record(msgCol2);
      asstMsgRec.set("conversation", conversationId);
      asstMsgRec.set("role", "assistant");
      asstMsgRec.set("content", finalText);
      if (msgHasCreatedAt) asstMsgRec.set("created_at", new Date().toISOString());
      $app.save(asstMsgRec);
    } catch (persistErr) {
      // Non-fatal: AI response is returned even if history persistence fails
      console.error("Failed to persist chat messages: " + persistErr);
    }

    return e.json(200, { message: finalText, actions_taken: actions_taken, conversation_id: conversationId, conversation_title: convTitle || null });

  } catch (err) {
    return e.json(500, { error: "Internal error processing AI response: " + String(err) });
  }
});
