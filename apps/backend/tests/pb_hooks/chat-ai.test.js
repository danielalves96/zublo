const chatAi = require("../../pb_hooks/lib/pure/chat-ai.js");

describe("pb_hooks/lib/pure/chat-ai.js", () => {
  it("keeps plain assistant text as model output and accepts object tool arguments", () => {
    const result = chatAi.buildGeminiContents([
      { role: "assistant", content: "plain text" },
      {
        role: "assistant",
        tool_calls: [{ function: { name: "lookup", arguments: { id: 3 } } }],
      },
    ]);

    expect(result).toEqual([
      { role: "model", parts: [{ text: "plain text" }] },
      { role: "model", parts: [{ functionCall: { name: "lookup", args: { id: 3 } } }] },
    ]);
  });

  it("builds Gemini contents while skipping system messages and grouping tool responses", () => {
    const result = chatAi.buildGeminiContents([
      { role: "system", content: "sys" },
      { role: "user", content: "hello" },
      {
        role: "assistant",
        tool_calls: [{ function: { name: "lookup", arguments: "{\"id\":1}" } }],
      },
      { role: "tool", name: "lookup", content: "{\"ok\":true}" },
      { role: "tool", name: "second", content: "{\"ok\":false}" },
    ]);

    expect(result).toEqual([
      { role: "user", parts: [{ text: "hello" }] },
      { role: "model", parts: [{ functionCall: { name: "lookup", args: { id: 1 } } }] },
      {
        role: "user",
        parts: [
          {
            functionResponse: { name: "lookup", response: { output: "{\"ok\":true}" } },
          },
          {
            functionResponse: { name: "second", response: { output: "{\"ok\":false}" } },
          },
        ],
      },
    ]);
  });

  it("builds Gemini and OpenAI request payloads", () => {
    const gemini = chatAi.buildChatRequest(
      "https://generativelanguage.googleapis.com/v1beta",
      "k",
      "",
      [
        { role: "system", content: "sys" },
        { role: "user", content: "hi" },
      ],
      [{ function: { name: "lookup", description: "d", parameters: { type: "object" } } }],
    );
    expect(gemini.isGemini).toBe(true);
    expect(gemini.body.systemInstruction.parts[0].text).toBe("sys");
    expect(gemini.body.tools[0].functionDeclarations[0].name).toBe("lookup");

    const openai = chatAi.buildChatRequest(
      "https://api.example.com",
      "token",
      "gpt-4o",
      [{ role: "user", content: "hi" }],
      [],
    );
    expect(openai.isGemini).toBe(false);
    expect(openai.headers.Authorization).toBe("Bearer token");
    expect(openai.body.tool_choice).toBeUndefined();
  });

  it("buildChatRequest: tools=null falls back to [] (line 82) and null model uses default (line 103)", () => {
    // Gemini path: tools=null → tools || [] = [] → functionDeclarations = [] (line 82 fallback)
    const gemini = chatAi.buildChatRequest(
      "https://generativelanguage.googleapis.com/v1beta",
      "k",
      "",
      [{ role: "user", content: "hi" }],
      null,
    );
    expect(gemini.body.tools).toBeUndefined();

    // OpenAI path: model=null → model || "gpt-3.5-turbo" (line 103 fallback)
    const openai = chatAi.buildChatRequest(
      "https://api.example.com",
      "t",
      null,
      [{ role: "user", content: "hi" }],
      [],
    );
    expect(openai.body.model).toBe("gpt-3.5-turbo");
  });

  it("adds OpenAI tool selection when tools exist and omits Gemini system instructions when absent", () => {
    const gemini = chatAi.buildChatRequest(
      "https://generativelanguage.googleapis.com/v1beta",
      "",
      "",
      [{ role: "user", content: "hi" }],
      [],
    );
    expect(gemini.body.systemInstruction).toBeUndefined();
    expect(gemini.body.tools).toBeUndefined();

    const openai = chatAi.buildChatRequest(
      "https://api.example.com",
      "",
      "gpt-4o",
      [{ role: "user", content: "hi" }],
      [{ function: { name: "lookup", description: "d", parameters: { type: "object" } } }],
    );
    expect(openai.headers.Authorization).toBeUndefined();
    expect(openai.body.tool_choice).toBe("auto");
  });

  it("normalizes Gemini and OpenAI response payloads", () => {
    expect(
      chatAi.parseChatResponse(
        { candidates: [{ content: { parts: [{ text: "hello" }] } }] },
        true,
      ),
    ).toEqual({ text: "hello" });
    expect(
      chatAi.parseChatResponse(
        {
          candidates: [
            { content: { parts: [{ functionCall: { name: "lookup", args: { id: 1 } } }] } },
          ],
        },
        true,
      ),
    ).toEqual({
      tool_calls: [{ id: "gemini_lookup_0", name: "lookup", arguments: { id: 1 } }],
    });

    expect(
      chatAi.parseChatResponse({ choices: [{ message: { content: "ok" } }] }, false),
    ).toEqual({ text: "ok" });
    expect(
      chatAi.parseChatResponse(
        {
          choices: [
            {
              message: {
                tool_calls: [
                  { id: "1", function: { name: "lookup", arguments: "{\"id\":2}" } },
                ],
                reasoning_content: "why",
              },
            },
          ],
        },
        false,
      ),
    ).toEqual({
      tool_calls: [{ id: "1", name: "lookup", arguments: { id: 2 } }],
      reasoning_content: "why",
    });
  });

  it("handles fallback and error response shapes", () => {
    expect(
      chatAi.parseChatResponse({ message: { content: "fallback" } }, false),
    ).toEqual({ text: "fallback" });
    expect(() => chatAi.parseChatResponse({}, true)).toThrow(
      "Unexpected Gemini response format",
    );
    expect(() => chatAi.parseChatResponse({}, false)).toThrow("Unexpected AI response format");
  });

  it("Gemini text parts: skips parts without a text field (line 151 false branch)", () => {
    // parts[x].text is falsy for the first part → not pushed
    expect(
      chatAi.parseChatResponse(
        { candidates: [{ content: { parts: [{ noText: true }, { text: "hello" }] } }] },
        true,
      ),
    ).toEqual({ text: "hello" });
  });

  it("OpenAI: choice exists but has no message property (line 157 !choice.message branch)", () => {
    // choice = {} → !choice is false, !choice.message is true → falls to resData.message check
    expect(() => chatAi.parseChatResponse({ choices: [{}] }, false)).toThrow(
      "Unexpected AI response format",
    );
  });

  it("OpenAI tool call: uses {} fallback when arguments is undefined (lines 172-174)", () => {
    // toolCall.function.arguments is undefined → not a string → `undefined || {}` = {}
    expect(
      chatAi.parseChatResponse(
        {
          choices: [
            { message: { tool_calls: [{ id: "1", function: { name: "fn" } }] } },
          ],
        },
        false,
      ),
    ).toEqual({
      tool_calls: [{ id: "1", name: "fn", arguments: {} }],
      reasoning_content: null,
    });
  });
});
