/// <reference path="../pb_data/types.d.ts" />

var aiParsers = require(__hooks + "/lib/pure/ai-parsers.js");

// ================================================================
// ROUTE: AI — Fetch Available Models
// Accepts url + api_key in the POST body (so user can fetch before saving)
// Falls back to saved settings if no params provided
// ================================================================
routerAdd("POST", "/api/ai/models", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");

  const body = e.requestInfo().body || {};
  const bodyUrl = typeof body.url === "string" ? body.url : "";
  const bodyKey = typeof body.api_key === "string" ? body.api_key : "";

  let apiUrl = bodyUrl ? bodyUrl.replace(/\/$/, "") : null;
  let apiKey = bodyKey || null;

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

  try {
    const modelsEndpoint = apiUrl + "/models";

    // First attempt: Bearer auth (OpenAI-compatible providers)
    let res = $http.send({
      url: modelsEndpoint,
      method: "GET",
      headers: apiKey ? { "Authorization": "Bearer " + apiKey } : {},
    });

    // Second attempt: Google-compatible API key header
    if (res.statusCode === 401 && apiKey) {
      res = $http.send({
        url: modelsEndpoint,
        method: "GET",
        headers: { "x-goog-api-key": apiKey },
      });
    }

    if (res.statusCode === 200) {
      const rawBody = aiParsers.getRawResponseText(res);
      const resData = JSON.parse(rawBody);
      const parsed = aiParsers.parseModels(resData);
      for (const m of parsed) models.push(m);
    } else {
      return e.json(res.statusCode, { error: "Provider returned status " + res.statusCode, details: res.text });
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
    const curId = sub.get("currency");
    if (curId) {
      try {
        const cur = $app.findRecordById("currencies", curId);
        currencySymbol = cur.get("symbol") || "$";
      } catch (_) {}
    }

    let cycleName = "monthly";
    const cycleId = sub.get("cycle");
    if (cycleId) {
      try {
        const cycle = $app.findRecordById("cycles", cycleId);
        cycleName = (cycle.get("name") || "monthly").toLowerCase();
      } catch (_) {}
    }

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

  const requestConfig = aiParsers.buildRecommendationRequest(rawUrl, apiKey, model, systemPrompt, userPrompt);
  const isGemini = requestConfig.isGemini;

  try {
    const res = $http.send({
      url: requestConfig.aiUrl,
      method: "POST",
      headers: requestConfig.aiHeaders,
      body: JSON.stringify(requestConfig.aiBody),
    });

    if (res.statusCode !== 200) {
      return e.json(500, { error: "AI API error: " + res.statusCode, details: res.text });
    }

    const rawBody = aiParsers.getRawResponseText(res);
    const resData = JSON.parse(rawBody);
    let responseText = "";
    try {
      responseText = aiParsers.extractRecommendationText(resData, isGemini);
    } catch (_) {
      return e.json(500, { error: "Unexpected AI response format", details: rawBody });
    }

    responseText = aiParsers.stripJsonFence(responseText);
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
