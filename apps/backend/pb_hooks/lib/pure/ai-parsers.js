function cleanModelName(value) {
  return String(value || "").replace(/^models\//, "");
}

function parseModels(json) {
  const output = [];

  if (json && json.data && Array.isArray(json.data)) {
    for (const item of json.data) {
      if (item && item.id) output.push(cleanModelName(item.id));
    }
  } else if (json && json.models && Array.isArray(json.models)) {
    for (const item of json.models) {
      if (item && item.name) output.push(cleanModelName(item.name));
    }
  } else if (Array.isArray(json)) {
    for (const item of json) {
      if (typeof item === "string") output.push(cleanModelName(item));
      else if (item && item.id) output.push(cleanModelName(item.id));
      else if (item && item.name) output.push(cleanModelName(item.name));
    }
  }

  return output;
}

function getRawResponseText(res) {
  if (typeof res.text === "string" && res.text.length > 0) return res.text;
  if (typeof res.body === "string" && res.body.length > 0) return res.body;
  return String(res.raw ?? "");
}

function stripJsonFence(value) {
  return String(value || "").replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

function detectGeminiUrl(rawUrl) {
  return String(rawUrl || "").indexOf("generativelanguage.googleapis.com") !== -1;
}

function buildRecommendationRequest(rawUrl, apiKey, model, systemPrompt, userPrompt) {
  const isGemini = detectGeminiUrl(rawUrl);

  if (isGemini) {
    return {
      isGemini: true,
      aiUrl: rawUrl + "/models/" + (model || "gemini-1.5-flash") + ":generateContent",
      aiHeaders: {
        "Content-Type": "application/json",
        ...(apiKey ? { "x-goog-api-key": apiKey } : {}),
      },
      aiBody: {
        contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
      },
    };
  }

  return {
    isGemini: false,
    aiUrl: rawUrl + "/chat/completions",
    aiHeaders: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: "Bearer " + apiKey } : {}),
    },
    aiBody: {
      model: model || "",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    },
  };
}

function extractRecommendationText(resData, isGemini) {
  if (isGemini) {
    return resData.candidates[0].content.parts[0].text;
  }
  if (resData.choices && resData.choices[0]) {
    return resData.choices[0].message.content;
  }
  if (resData.message && resData.message.content) {
    return resData.message.content;
  }
  throw new Error("Unexpected AI response format");
}

module.exports = {
  cleanModelName,
  parseModels,
  getRawResponseText,
  stripJsonFence,
  detectGeminiUrl,
  buildRecommendationRequest,
  extractRecommendationText,
};
