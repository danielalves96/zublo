const aiParsers = require("../../pb_hooks/lib/pure/ai-parsers.js");

describe("pb_hooks/lib/pure/ai-parsers.js", () => {
  it("cleans provider-specific model prefixes and detects Gemini URLs", () => {
    expect(aiParsers.cleanModelName("models/gemini-2.5-pro")).toBe("gemini-2.5-pro");
    expect(aiParsers.cleanModelName("gpt-4.1")).toBe("gpt-4.1");
    expect(aiParsers.detectGeminiUrl("https://generativelanguage.googleapis.com/v1beta")).toBe(
      true,
    );
    expect(aiParsers.detectGeminiUrl("https://api.openai.com/v1")).toBe(false);
  });

  it("parses model lists from OpenAI, Gemini/Ollama, and array payloads", () => {
    expect(
      aiParsers.parseModels({ data: [{ id: "gpt-4o" }, { id: "models/gemini-1.5-flash" }] }),
    ).toEqual(["gpt-4o", "gemini-1.5-flash"]);
    expect(
      aiParsers.parseModels({
        models: [{ name: "models/gemini-2.0-flash" }, { name: "llama3.2" }],
      }),
    ).toEqual(["gemini-2.0-flash", "llama3.2"]);
    expect(aiParsers.parseModels(["models/foo", { id: "bar" }, { name: "baz" }])).toEqual([
      "foo",
      "bar",
      "baz",
    ]);
  });

  it("chooses the most specific response body representation", () => {
    expect(aiParsers.getRawResponseText({ text: "t", body: "b", raw: "r" })).toBe("t");
    expect(aiParsers.getRawResponseText({ text: "", body: "b", raw: "r" })).toBe("b");
    expect(aiParsers.getRawResponseText({ text: "", body: "", raw: "r" })).toBe("r");
    expect(aiParsers.getRawResponseText({})).toBe("");
  });

  it("strips fenced json wrappers", () => {
    expect(aiParsers.stripJsonFence("```json\n[{\"ok\":true}]\n```")).toBe('[{"ok":true}]');
  });

  it("builds provider-specific recommendation requests", () => {
    const gemini = aiParsers.buildRecommendationRequest(
      "https://generativelanguage.googleapis.com/v1beta",
      "secret",
      "",
      "sys",
      "user",
    );
    expect(gemini.isGemini).toBe(true);
    expect(gemini.aiUrl).toContain(":generateContent");
    expect(gemini.aiHeaders["x-goog-api-key"]).toBe("secret");

    const openai = aiParsers.buildRecommendationRequest(
      "https://api.example.com",
      "token",
      "gpt-4o-mini",
      "sys",
      "user",
    );
    expect(openai.isGemini).toBe(false);
    expect(openai.aiUrl).toContain("/chat/completions");
    expect(openai.aiHeaders.Authorization).toBe("Bearer token");
    expect(openai.aiBody.messages).toHaveLength(2);
  });

  it("omits provider auth headers when no API key is supplied", () => {
    const gemini = aiParsers.buildRecommendationRequest(
      "https://generativelanguage.googleapis.com/v1beta",
      "",
      "",
      "sys",
      "user",
    );
    expect(gemini.aiHeaders["x-goog-api-key"]).toBeUndefined();

    const openai = aiParsers.buildRecommendationRequest(
      "https://api.example.com",
      "",
      "gpt-4o-mini",
      "sys",
      "user",
    );
    expect(openai.aiHeaders.Authorization).toBeUndefined();
  });

  it("extracts text from Gemini, OpenAI, and Ollama response shapes", () => {
    expect(
      aiParsers.extractRecommendationText(
        { candidates: [{ content: { parts: [{ text: "gemini" }] } }] },
        true,
      ),
    ).toBe("gemini");
    expect(
      aiParsers.extractRecommendationText(
        { choices: [{ message: { content: "openai" } }] },
        false,
      ),
    ).toBe("openai");
    expect(
      aiParsers.extractRecommendationText({ message: { content: "ollama" } }, false),
    ).toBe("ollama");
    expect(() => aiParsers.extractRecommendationText({}, false)).toThrow(
      "Unexpected AI response format",
    );
  });
});
