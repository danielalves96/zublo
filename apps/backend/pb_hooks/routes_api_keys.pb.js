/// <reference path="../pb_data/types.d.ts" />

// ================================================================
// GET /api/api-keys  — list keys for the authenticated user
// ================================================================
routerAdd("GET", "/api/api-keys", function(e) {
  try {
    if (!e.auth) return e.json(401, { error: "Authentication required" });

    var keys = $app.findRecordsByFilter(
      "api_keys", "user = {:userId}", "", 0, 0, { userId: e.auth.id }
    );

    var items = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var perms = [];
      try { perms = JSON.parse(k.get("permissions") || "[]"); } catch (_) {}
      items.push({
        id: k.id,
        name: k.get("name"),
        key_prefix: k.get("key_prefix"),
        permissions: perms,
        last_used_at: k.get("last_used_at") || null,
        created: k.get("created_at") || null,
      });
    }

    return e.json(200, { items: items });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// POST /api/api-keys  — create a new API key (plain key returned once)
// ================================================================
routerAdd("POST", "/api/api-keys", function(e) {
  try {
    if (!e.auth) return e.json(401, { error: "Authentication required" });

    var validPerms = ["subscriptions:read", "subscriptions:write", "calendar:read", "statistics:read"];
    var body = e.requestInfo().body;
    var name = String(body.name || "").trim();
    var rawPerms = body.permissions;

    var permissions = [];
    if (rawPerms && typeof rawPerms === "object") {
      for (var i = 0; i < rawPerms.length; i++) permissions.push(String(rawPerms[i]));
    }

    if (!name) return e.json(400, { error: "Name is required" });
    if (permissions.length === 0) return e.json(400, { error: "At least one permission is required" });
    for (var pi = 0; pi < permissions.length; pi++) {
      if (validPerms.indexOf(permissions[pi]) === -1) {
        return e.json(400, { error: "Invalid permission: " + permissions[pi] });
      }
    }

    var existing = $app.findRecordsByFilter(
      "api_keys", "user = {:userId}", "", 0, 0, { userId: e.auth.id }
    );
    if (existing.length >= 20) return e.json(400, { error: "Maximum of 20 API keys reached" });

    var now = new Date().toISOString();
    var token = $security.randomString(40);
    var plainKey = "wk_" + token;
    var keyHash = $security.sha256(plainKey);
    var keyPrefix = plainKey.substring(0, 14) + "...";

    var col = $app.findCollectionByNameOrId("api_keys");
    var record = new Record(col);
    record.set("name", name);
    record.set("user", e.auth.id);
    record.set("key_hash", keyHash);
    record.set("key_prefix", keyPrefix);
    record.set("permissions", JSON.stringify(permissions));
    record.set("created_at", now);
    $app.save(record);

    return e.json(200, {
      id: record.id,
      name: name,
      key: plainKey,
      key_prefix: keyPrefix,
      permissions: permissions,
      last_used_at: null,
      created: now,
    });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// DELETE /api/api-keys/:id
// ================================================================
routerAdd("DELETE", "/api/api-keys/{id}", function(e) {
  try {
    if (!e.auth) return e.json(401, { error: "Authentication required" });

    var id = e.request.pathValue("id");
    var keyRecord;
    try { keyRecord = $app.findRecordById("api_keys", id); }
    catch (_) { return e.json(404, { error: "API key not found" }); }

    if (keyRecord.get("user") !== e.auth.id) return e.json(403, { error: "Forbidden" });

    $app.delete(keyRecord);
    return e.json(200, { success: true });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// GET /api/external/subscriptions  (requires subscriptions:read)
// ================================================================
routerAdd("GET", "/api/external/subscriptions", function(e) {
  try {
    var rawKey = e.request.url.query().get("key")
      || (e.request.header.get("Authorization") || "").replace("Bearer ", "").trim();

    // inline resolveApiKey
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "subscriptions:read") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var subs = $app.findRecordsByFilter(
      "subscriptions", "user = {:userId}", "next_payment", 0, 0, { userId: userId }
    );

    var items = [];
    for (var i = 0; i < subs.length; i++) {
      var sub = subs[i];
      var currencySymbol = "", currencyCode = "", cycleName = "";
      var categoryName = "", paymentMethodName = "", payerName = "";

      try { var cur = $app.findRecordById("currencies", sub.get("currency")); currencySymbol = cur.get("symbol"); currencyCode = cur.get("code"); } catch (_) {}
      try { var cyc = $app.findRecordById("cycles", sub.get("cycle")); cycleName = cyc.get("name"); } catch (_) {}
      try { var cat = $app.findRecordById("categories", sub.get("category")); categoryName = cat.get("name"); } catch (_) {}
      try { var pm = $app.findRecordById("payment_methods", sub.get("payment_method")); paymentMethodName = pm.get("name"); } catch (_) {}
      try { var py = $app.findRecordById("household", sub.get("payer")); payerName = py.get("name"); } catch (_) {}

      items.push({
        id: sub.id,
        name: sub.get("name"),
        price: sub.get("price"),
        currency_symbol: currencySymbol,
        currency_code: currencyCode,
        frequency: sub.get("frequency"),
        cycle: cycleName,
        next_payment: sub.get("next_payment"),
        auto_renew: sub.get("auto_renew"),
        inactive: sub.get("inactive"),
        notes: sub.get("notes") || null,
        url: sub.get("url") || null,
        category: categoryName || null,
        payment_method: paymentMethodName || null,
        payer: payerName || null,
      });
    }

    return e.json(200, { items: items, total: items.length });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// POST /api/external/subscriptions  (requires subscriptions:write)
// ================================================================
routerAdd("POST", "/api/external/subscriptions", function(e) {
  try {
    var rawKey = e.request.url.query().get("key")
      || (e.request.header.get("Authorization") || "").replace("Bearer ", "").trim();

    // inline resolveApiKey
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "subscriptions:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var body = e.requestInfo().body;
    var name = String(body.name || "").trim();
    var price = parseFloat(body.price) || 0;
    var currencyId = String(body.currency_id || "").trim();
    var cycleId = String(body.cycle_id || "").trim();
    var frequency = parseInt(body.frequency) || 1;
    var nextPayment = String(body.next_payment || "").trim();

    if (!name) return e.json(400, { error: "name is required" });
    if (!currencyId) return e.json(400, { error: "currency_id is required" });
    if (!cycleId) return e.json(400, { error: "cycle_id is required" });
    if (!nextPayment) return e.json(400, { error: "next_payment is required (YYYY-MM-DD)" });

    try {
      var cur = $app.findRecordById("currencies", currencyId);
      if (cur.get("user") !== userId) return e.json(400, { error: "Invalid currency_id" });
    } catch (_) { return e.json(400, { error: "currency_id not found" }); }

    var col = $app.findCollectionByNameOrId("subscriptions");
    var record = new Record(col);
    record.set("name", name);
    record.set("price", price);
    record.set("currency", currencyId);
    record.set("cycle", cycleId);
    record.set("frequency", frequency);
    record.set("next_payment", nextPayment);
    record.set("user", userId);
    record.set("auto_renew", body.auto_renew === true);
    record.set("notify", body.notify === true);
    record.set("notify_days_before", parseInt(body.notify_days_before) || 3);
    record.set("inactive", body.inactive === true);
    if (body.notes) record.set("notes", String(body.notes));
    if (body.url) record.set("url", String(body.url));
    if (body.category_id) record.set("category", String(body.category_id));
    if (body.payment_method_id) record.set("payment_method", String(body.payment_method_id));
    if (body.payer_id) record.set("payer", String(body.payer_id));

    $app.save(record);
    return e.json(200, { id: record.id, name: name, price: price, next_payment: nextPayment });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// GET /api/external/statistics  (requires statistics:read)
// ================================================================
routerAdd("GET", "/api/external/statistics", function(e) {
  try {
    var rawKey = e.request.url.query().get("key")
      || (e.request.header.get("Authorization") || "").replace("Bearer ", "").trim();

    // inline resolveApiKey
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "statistics:read") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var subs = $app.findRecordsByFilter(
      "subscriptions", "user = {:userId} && inactive = false", "", 0, 0, { userId: userId }
    );

    var mainCurrencySymbol = "", mainCurrencyCode = "";
    try {
      var mainCurs = $app.findRecordsByFilter(
        "currencies", "user = {:userId} && is_main = true", "", 1, 0, { userId: userId }
      );
      if (mainCurs.length > 0) { mainCurrencySymbol = mainCurs[0].get("symbol"); mainCurrencyCode = mainCurs[0].get("code"); }
    } catch (_) {}

    var totalMonthly = 0;
    var breakdown = [];

    for (var i = 0; i < subs.length; i++) {
      var sub = subs[i];
      var cycleMultiplier = 1;
      try {
        var cyc = $app.findRecordById("cycles", sub.get("cycle"));
        var cn = cyc.get("name");
        if (cn === "Daily") cycleMultiplier = 30.44;
        else if (cn === "Weekly") cycleMultiplier = 4.33;
        else if (cn === "Monthly") cycleMultiplier = 1;
        else if (cn === "Yearly") cycleMultiplier = 1 / 12;
      } catch (_) {}

      var freq = sub.get("frequency") || 1;
      var price = sub.get("price") || 0;
      var monthly = (price / freq) * cycleMultiplier;
      totalMonthly += monthly;
      breakdown.push({ id: sub.id, name: sub.get("name"), price: price, monthly_equivalent: Math.round(monthly * 100) / 100 });
    }

    return e.json(200, {
      active_count: subs.length,
      total_monthly: Math.round(totalMonthly * 100) / 100,
      total_yearly: Math.round(totalMonthly * 12 * 100) / 100,
      currency_symbol: mainCurrencySymbol,
      currency_code: mainCurrencyCode,
      breakdown: breakdown,
    });
  } catch (err) { return e.json(500, { error: String(err) }); }
});
