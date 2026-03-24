var aiParsers = require("./ai-parsers.js");

function buildGeminiContents(messages) {
  var result = [];
  var index = 0;

  while (index < messages.length) {
    var message = messages[index];
    if (message.role === "system") {
      index++;
      continue;
    }

    if (message.role === "tool") {
      var toolParts = [];
      while (index < messages.length && messages[index].role === "tool") {
        var toolMessage = messages[index];
        toolParts.push({
          functionResponse: {
            name: toolMessage.name,
            response: { output: toolMessage.content },
          },
        });
        index++;
      }
      result.push({ role: "user", parts: toolParts });
      continue;
    }

    if (message.role === "assistant" && message.tool_calls) {
      var assistantParts = [];
      for (var toolIndex = 0; toolIndex < message.tool_calls.length; toolIndex++) {
        var toolCall = message.tool_calls[toolIndex];
        assistantParts.push({
          functionCall: {
            name: toolCall.function.name,
            args: typeof toolCall.function.arguments === "string"
              ? JSON.parse(toolCall.function.arguments)
              : (toolCall.function.arguments || {}),
          },
        });
      }
      result.push({ role: "model", parts: assistantParts });
      index++;
      continue;
    }

    result.push({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.content || "" }],
    });
    index++;
  }

  return result;
}

function buildGeminiToolDeclarations(tools) {
  var declarations = [];
  for (var index = 0; index < tools.length; index++) {
    declarations.push({
      name: tools[index].function.name,
      description: tools[index].function.description,
      parameters: tools[index].function.parameters,
    });
  }
  return declarations;
}

function buildChatRequest(rawUrl, apiKey, model, messages, tools) {
  var isGemini = aiParsers.detectGeminiUrl(rawUrl);

  if (isGemini) {
    var systemMessage = null;
    for (var index = 0; index < messages.length; index++) {
      if (messages[index].role === "system") {
        systemMessage = messages[index];
        break;
      }
    }

    var functionDeclarations = buildGeminiToolDeclarations(tools || []);
    var body = {
      contents: buildGeminiContents(messages),
      generationConfig: { maxOutputTokens: 4096 },
    };
    if (functionDeclarations.length > 0) {
      body.tools = [{ functionDeclarations: functionDeclarations }];
    }
    if (systemMessage) {
      body.systemInstruction = { parts: [{ text: systemMessage.content }] };
    }

    return {
      isGemini: true,
      url: rawUrl + "/models/" + (model || "gemini-1.5-flash") + ":generateContent?key=" + (apiKey || ""),
      headers: { "Content-Type": "application/json" },
      body: body,
    };
  }

  var openAiBody = {
    model: model || "gpt-3.5-turbo",
    messages: messages,
    temperature: 0.7,
    max_tokens: 4096,
  };
  if (tools && tools.length > 0) {
    openAiBody.tools = tools;
    openAiBody.tool_choice = "auto";
  }

  return {
    isGemini: false,
    url: rawUrl + "/chat/completions",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: "Bearer " + apiKey } : {}),
    },
    body: openAiBody,
  };
}

function parseChatResponse(resData, isGemini) {
  if (isGemini) {
    var candidate = resData.candidates && resData.candidates[0];
    if (!candidate || !candidate.content || !candidate.content.parts) {
      throw new Error("Unexpected Gemini response format");
    }

    var parts = candidate.content.parts;
    var functionCalls = [];
    for (var partIndex = 0; partIndex < parts.length; partIndex++) {
      if (parts[partIndex].functionCall) functionCalls.push(parts[partIndex]);
    }
    if (functionCalls.length > 0) {
      var toolCalls = [];
      for (var callIndex = 0; callIndex < functionCalls.length; callIndex++) {
        var functionCall = functionCalls[callIndex].functionCall;
        toolCalls.push({
          id: "gemini_" + functionCall.name + "_" + callIndex,
          name: functionCall.name,
          arguments: functionCall.args || {},
        });
      }
      return { tool_calls: toolCalls };
    }

    var textParts = [];
    for (var textIndex = 0; textIndex < parts.length; textIndex++) {
      if (parts[textIndex].text) textParts.push(parts[textIndex].text);
    }
    return { text: textParts.join("") };
  }

  var choice = resData.choices && resData.choices[0];
  if (!choice || !choice.message) {
    if (resData.message && resData.message.content) {
      return { text: resData.message.content };
    }
    throw new Error("Unexpected AI response format");
  }

  var message = choice.message;
  if (message.tool_calls && message.tool_calls.length > 0) {
    var normalizedToolCalls = [];
    for (var toolIndex = 0; toolIndex < message.tool_calls.length; toolIndex++) {
      var toolCall = message.tool_calls[toolIndex];
      normalizedToolCalls.push({
        id: toolCall.id,
        name: toolCall.function.name,
        arguments: typeof toolCall.function.arguments === "string"
          ? JSON.parse(toolCall.function.arguments)
          : (toolCall.function.arguments || {}),
      });
    }
    return {
      tool_calls: normalizedToolCalls,
      reasoning_content: message.reasoning_content || null,
    };
  }

  return { text: message.content || "" };
}

module.exports = {
  buildGeminiContents,
  buildGeminiToolDeclarations,
  buildChatRequest,
  parseChatResponse,
};
