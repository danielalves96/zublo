import type { AISettings, ChatMessage } from "@/types";

vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
    get: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock("@/lib/pb", () => ({
  default: {
    collection: vi.fn(),
    filter: vi.fn(),
  },
}));

import { api } from "@/lib/api";
import pb from "@/lib/pb";

import { aiService } from "./ai";

function getCollectionMock(overrides: Record<string, unknown> = {}) {
  return {
    getList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    getFullList: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  };
}

describe("aiService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the first settings record when it exists", async () => {
    const getList = vi.fn().mockResolvedValue({
      items: [{ id: "settings-1", enabled: true }],
    });
    (pb.filter as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "filter:user-1",
    );
    (pb.collection as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      getCollectionMock({ getList }),
    );

    await expect(aiService.getSettings("user-1")).resolves.toEqual({
      id: "settings-1",
      enabled: true,
    });

    expect(pb.collection).toHaveBeenCalledWith("ai_settings");
    expect(pb.filter).toHaveBeenCalledWith("user = {:userId}", {
      userId: "user-1",
    });
    expect(getList).toHaveBeenCalledWith(1, 1, {
      filter: "filter:user-1",
    });
  });

  it("returns null when settings are empty or the request fails", async () => {
    (pb.filter as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "filter:user-1",
    );
    (pb.collection as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(
        getCollectionMock({
          getList: vi.fn().mockResolvedValue({ items: [] }),
        }),
      )
      .mockReturnValueOnce(
        getCollectionMock({
          getList: vi.fn().mockRejectedValue(new Error("boom")),
        }),
      );

    await expect(aiService.getSettings("user-1")).resolves.toBeNull();
    await expect(aiService.getSettings("user-1")).resolves.toBeNull();
  });

  it("creates and updates settings through PocketBase", async () => {
    const create = vi.fn().mockResolvedValue({ id: "settings-1" });
    const update = vi.fn().mockResolvedValue({ id: "settings-1", enabled: true });
    (pb.collection as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      getCollectionMock({ create, update }),
    );

    const createPayload: Partial<AISettings> = {
      user: "user-1",
      enabled: true,
    };

    await aiService.createSettings(createPayload);
    await aiService.updateSettings("settings-1", { enabled: true });

    expect(create).toHaveBeenCalledWith(createPayload);
    expect(update).toHaveBeenCalledWith("settings-1", { enabled: true });
  });

  it("lists and deletes recommendations through PocketBase", async () => {
    const getFullList = vi.fn().mockResolvedValue([{ id: "rec-1" }]);
    const remove = vi.fn().mockResolvedValue(undefined);
    (pb.filter as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "filter:user-1",
    );
    (pb.collection as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(getCollectionMock({ getFullList }))
      .mockReturnValueOnce(getCollectionMock({ delete: remove }));

    await expect(aiService.listRecommendations("user-1")).resolves.toEqual([
      { id: "rec-1" },
    ]);
    await aiService.deleteRecommendation("rec-1");

    expect(getFullList).toHaveBeenCalledWith({ filter: "filter:user-1" });
    expect(remove).toHaveBeenCalledWith("rec-1");
  });

  it("proxies generate and model requests through the API client", async () => {
    (api.post as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ count: 3 })
      .mockResolvedValueOnce({ models: ["gpt-4.1", "gemini-2.5"] })
      .mockResolvedValueOnce({ models: ["default"] });

    await expect(aiService.generate()).resolves.toEqual({ count: 3 });
    await expect(
      aiService.getModels("http://localhost:11434", "secret"),
    ).resolves.toEqual({
      models: ["gpt-4.1", "gemini-2.5"],
    });
    await expect(aiService.getModels()).resolves.toEqual({
      models: ["default"],
    });

    expect(api.post).toHaveBeenNthCalledWith(1, "/api/ai/generate");
    expect(api.post).toHaveBeenNthCalledWith(2, "/api/ai/models", {
      url: "http://localhost:11434",
      api_key: "secret",
    });
    expect(api.post).toHaveBeenNthCalledWith(3, "/api/ai/models", {});
  });

  it("maps chat messages and forwards optional arguments", async () => {
    const signal = new AbortController().signal;
    const messages: ChatMessage[] = [
      { role: "user", content: "hello", isError: true },
      { role: "assistant", content: "world", aiContent: "hidden" },
    ];
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      message: "ok",
    });

    await aiService.chat(messages, "conv-1", "shown text", signal);
    await aiService.chat(messages);

    expect(api.post).toHaveBeenNthCalledWith(
      1,
      "/api/ai/chat",
      {
        messages: [
          { role: "user", content: "hello" },
          { role: "assistant", content: "world" },
        ],
        conversation_id: "conv-1",
        display_message: "shown text",
      },
      { signal },
    );
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      "/api/ai/chat",
      {
        messages: [
          { role: "user", content: "hello" },
          { role: "assistant", content: "world" },
        ],
        conversation_id: null,
        display_message: null,
      },
      { signal: undefined },
    );
  });

  it("proxies conversation endpoints through the API client", async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ conversations: [] })
      .mockResolvedValueOnce({ conversation: { id: "conv-1" }, messages: [] });
    (api.del as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
    });
    (api.patch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
    });

    await aiService.getConversations();
    await aiService.getConversationMessages("conv-1");
    await aiService.deleteConversation("conv-1");
    await aiService.renameConversation("conv-1", "Renamed");

    expect(api.get).toHaveBeenNthCalledWith(1, "/api/ai/conversations");
    expect(api.get).toHaveBeenNthCalledWith(2, "/api/ai/conversations/conv-1");
    expect(api.del).toHaveBeenCalledWith("/api/ai/conversations/conv-1");
    expect(api.patch).toHaveBeenCalledWith("/api/ai/conversations/conv-1", {
      title: "Renamed",
    });
  });
});
