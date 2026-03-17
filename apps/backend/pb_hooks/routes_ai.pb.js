/// <reference path="../pb_data/types.d.ts" />

// ================================================================
// ROUTE: AI — Fetch Available Models
// Accepts url + api_key as query params (so user can fetch before saving)
// Falls back to saved settings if no params provided
// ================================================================
routerAdd("GET", "/api/ai/models", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");

  const qUrl = e.request.url.query().get("url");
  const qKey = e.request.url.query().get("api_key");

  let apiUrl = qUrl ? qUrl.replace(/\/$/, "") : null;
  let apiKey = qKey || null;

  // If not provided via params, fall back to saved settings
  if (!apiUrl || !apiKey) {
    try {
      const records = $app.findRecordsByFilter(
        "ai_settings", "user = {:userId}", "", 1, 0, { userId: e.auth.id }
      );
      if (records.length > 0) {
        const s = records[0];
        if (!apiUrl) apiUrl = s.get("url");
        if (!apiKey) apiKey = s.get("api_key");
      }
    } catch (_) {}
  }

  if (!apiUrl) {
    return e.json(400, { error: "API URL is required" });
  }

  const models = [];

  function parseModels(json) {
    const out = [];
    // Strip "models/" prefix that Gemini prepends to model names
    function clean(s) { return s.replace(/^models\//, ""); }

    if (json.data && Array.isArray(json.data)) {
      // OpenAI format: { data: [{ id }] }
      for (const m of json.data) { if (m.id) out.push(clean(m.id)); }
    } else if (json.models && Array.isArray(json.models)) {
      // Ollama / Gemini format: { models: [{ name }] }
      for (const m of json.models) { if (m.name) out.push(clean(m.name)); }
    } else if (Array.isArray(json)) {
      for (const m of json) {
        if (typeof m === "string") out.push(clean(m));
        else if (m.id) out.push(clean(m.id));
        else if (m.name) out.push(clean(m.name));
      }
    }
    return out;
  }

  try {
    const modelsEndpoint = apiUrl + "/models";

    // First attempt: Bearer auth (OpenAI-compatible providers)
    let res = $http.send({
      url: modelsEndpoint,
      method: "GET",
      headers: apiKey ? { "Authorization": "Bearer " + apiKey } : {},
    });

    // Second attempt: key as query param (Google Gemini and similar)
    if (res.statusCode === 401 && apiKey) {
      const sep = modelsEndpoint.includes("?") ? "&" : "?";
      res = $http.send({
        url: modelsEndpoint + sep + "key=" + apiKey,
        method: "GET",
        headers: {},
      });
    }

    if (res.statusCode === 200) {
      const parsed = parseModels(res.json);
      for (const m of parsed) models.push(m);
    } else {
      return e.json(res.statusCode, { error: "Provider returned status " + res.statusCode });
    }
  } catch (err) {
    return e.json(500, { error: "Failed to fetch models: " + err });
  }

  return e.json(200, { models: models });
});

// ================================================================
// ROUTE: AI — Generate Recommendations
// ================================================================
routerAdd("POST", "/api/ai/generate", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const userId = e.auth.id;

  let aiSettings;
  try {
    const records = $app.findRecordsByFilter(
      "ai_settings",
      "user = {:userId} && enabled = true",
      "", 1, 0,
      { userId: userId }
    );
    if (records.length === 0) {
      return e.json(400, { error: "AI not configured or disabled" });
    }
    aiSettings = records[0];
  } catch (_) {
    return e.json(400, { error: "AI settings not found" });
  }

  const subs = $app.findRecordsByFilter(
    "subscriptions",
    "user = {:userId} && inactive = false",
    "", 0, 0,
    { userId: userId }
  );

  if (subs.length === 0) {
    return e.json(400, { error: "No active subscriptions found" });
  }

  let subsList = "";
  for (const sub of subs) {
    let currencySymbol = "$";
    try {
      const cur = $app.findRecordById("currencies", sub.get("currency"));
      currencySymbol = cur.get("symbol");
    } catch (_) {}

    let cycleName = "monthly";
    try {
      const cycle = $app.findRecordById("cycles", sub.get("cycle"));
      cycleName = cycle.get("name").toLowerCase();
    } catch (_) {}

    subsList += "- " + sub.get("name") + ": " + currencySymbol + sub.get("price") +
      " (" + cycleName + ", frequency: " + sub.get("frequency") + ")\n";
  }

  const user = $app.findRecordById("users", userId);
  const language = user.get("language") || "en";

  const systemPrompt =
    "You are a financial advisor AI assistant for a subscription management app called Zublo. " +
    "Analyze the user's subscriptions and provide 3-7 actionable recommendations to save money. " +
    "Each recommendation should have a title, description, and estimated savings amount. " +
    "Consider: duplicate services, cheaper alternatives, bundling opportunities, " +
    "unused subscriptions, and seasonal deals. " +
    "Respond in " + language + " language. " +
    "Return ONLY a JSON array with objects containing: title, description, savings (as string with currency).";

  const userPrompt = "Here are my current active subscriptions:\n\n" + subsList +
    "\nPlease analyze and provide money-saving recommendations.";

  const apiKey = aiSettings.get("api_key");
  const model = aiSettings.get("model");
  const rawUrl = (aiSettings.get("url") || "").replace(/\/$/, "");

  if (!rawUrl) {
    return e.json(400, { error: "AI provider URL not configured" });
  }

  // Detect Google Gemini by URL (uses ?key= auth and different endpoint/format)
  const isGemini = rawUrl.indexOf("generativelanguage.googleapis.com") !== -1;

  let aiUrl, aiHeaders, aiBody;

  if (isGemini) {
    const geminiModel = model || "gemini-1.5-flash";
    aiUrl = rawUrl + "/models/" + geminiModel + ":generateContent?key=" + (apiKey || "");
    aiHeaders = { "Content-Type": "application/json" };
    aiBody = {
      contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
    };
  } else {
    aiUrl = rawUrl + "/chat/completions";
    aiHeaders = {
      "Content-Type": "application/json",
      ...(apiKey ? { "Authorization": "Bearer " + apiKey } : {}),
    };
    aiBody = {
      model: model || "",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    };
  }

  try {
    const res = $http.send({
      url: aiUrl,
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify(aiBody),
    });

    if (res.statusCode !== 200) {
      return e.json(500, { error: "AI API error: " + res.statusCode });
    }

    let responseText = "";
    if (isGemini) {
      // Gemini format
      responseText = res.json.candidates[0].content.parts[0].text;
    } else if (res.json.choices && res.json.choices[0]) {
      responseText = res.json.choices[0].message.content;
    } else if (res.json.message && res.json.message.content) {
      // Ollama non-streaming
      responseText = res.json.message.content;
    } else {
      return e.json(500, { error: "Unexpected AI response format" });
    }

    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const recommendations = JSON.parse(responseText);

    try {
      const old = $app.findRecordsByFilter(
        "ai_recommendations", "user = {:userId}", "", 0, 0, { userId: userId }
      );
      for (const rec of old) {
        $app.delete(rec);
      }
    } catch (_) {}

    const recCol = $app.findCollectionByNameOrId("ai_recommendations");
    const saved = [];

    for (const rec of recommendations) {
      const record = new Record(recCol);
      record.set("user", userId);
      record.set("title", rec.title || "");
      record.set("description", rec.description || "");
      record.set("savings", rec.savings || "");
      record.set("type", aiSettings.get("type") || "custom");
      $app.save(record);
      saved.push({
        id: record.id,
        title: rec.title,
        description: rec.description,
        savings: rec.savings,
      });
    }

    return e.json(200, { recommendations: saved });
  } catch (err) {
    return e.json(500, { error: "Failed to generate recommendations: " + err });
  }
});
