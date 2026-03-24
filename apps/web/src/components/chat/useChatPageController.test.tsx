import { act, renderHook, waitFor } from "@testing-library/react";

import { queryKeys } from "@/lib/queryKeys";
import { createQueryClientWrapper } from "@/test/query-client";
import type { ChatConversation, ChatMessage } from "@/types";

const mocks = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  getConversations: vi.fn(),
  chat: vi.fn(),
  getConversationMessages: vi.fn(),
  deleteConversation: vi.fn(),
  renameConversation: vi.fn(),
  avatarUrl: vi.fn(),
  triggerExportDownload: vi.fn(),
  xlsxRead: vi.fn(),
  xlsxSheetToJson: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) => {
      if (key === "chat.subscription_created") {
        return `created:${String(options?.name ?? "")}`;
      }
      if (key === "chat.error_message") {
        return `error:${String(options?.error ?? "")}`;
      }
      if (key === "chat.file_size_error") {
        return `size:${String(options?.mb ?? "")}`;
      }
      return key;
    },
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      avatar: "avatar.png",
      email: "daniel@example.com",
      username: "daniel",
      name: "Daniel",
    },
    isLoading: false,
  }),
}));

vi.mock("@/services/ai", () => ({
  aiService: {
    getConversations: mocks.getConversations,
    chat: mocks.chat,
    getConversationMessages: mocks.getConversationMessages,
    deleteConversation: mocks.deleteConversation,
    renameConversation: mocks.renameConversation,
  },
}));

vi.mock("@/services/users", () => ({
  usersService: {
    avatarUrl: mocks.avatarUrl,
  },
}));

vi.mock("@/components/chat/utils", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/chat/utils")>();
  return {
    ...actual,
    triggerExportDownload: mocks.triggerExportDownload,
  };
});

vi.mock("xlsx", () => ({
  read: mocks.xlsxRead,
  utils: {
    sheet_to_json: mocks.xlsxSheetToJson,
  },
}));

import { useChatPageController } from "./useChatPageController";

function getConversation(
  overrides: Partial<ChatConversation> = {},
): ChatConversation {
  return {
    id: "conv-1",
    title: "Conversation 1",
    created: "2026-03-20T12:00:00Z",
    updated: "2026-03-20T12:00:00Z",
    ...overrides,
  };
}

describe("useChatPageController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.avatarUrl.mockReturnValue("https://cdn.example.com/avatar.png");
    mocks.getConversations.mockResolvedValue({ conversations: [] });
    mocks.getConversationMessages.mockResolvedValue({
      conversation: getConversation(),
      messages: [],
    });
    mocks.deleteConversation.mockResolvedValue({ success: true });
    mocks.renameConversation.mockResolvedValue({ success: true });
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1280,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("loads the welcome state, avatar, and conversations on mount", async () => {
    mocks.getConversations.mockResolvedValue({
      conversations: [
        getConversation({
          id: "conv-1",
          title: "Today conversation",
          updated: "2026-03-20T09:00:00Z",
        }),
      ],
    });

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(1);
    });

    expect(result.current.avatarUrl).toBe("https://cdn.example.com/avatar.png");
    expect(result.current.messages).toEqual([
      { role: "assistant", content: "chat.welcome" },
    ]);
    expect(result.current.conversationGroups[0]?.items).toEqual([
      expect.objectContaining({ id: "conv-1" }),
    ]);
    expect(mocks.getConversations).toHaveBeenCalledTimes(1);
  });

  it("sends a pending spreadsheet message, syncs the new conversation, exports data, and invalidates related queries", async () => {
    const response = {
      message: "assistant reply",
      conversation_id: "conv-new",
      conversation_title: "AI Title",
      actions_taken: [
        {
          tool: "create_subscription",
          type: "subscription",
          result: { name: "Netflix" },
        },
        {
          tool: "export_subscriptions",
          type: "export",
          result: {
            data: [{ id: "sub-1" }],
            filename: "subscriptions.json",
            format: "json",
          },
        },
        { tool: "update_category", type: "category", result: {} },
        { tool: "update_payment_method", type: "payment_method", result: {} },
        { tool: "update_household", type: "household", result: {} },
        { tool: "update_currency", type: "currency", result: {} },
      ],
    };

    mocks.chat.mockResolvedValue(response);
    mocks.getConversations
      .mockResolvedValueOnce({ conversations: [] })
      .mockResolvedValueOnce({
        conversations: [
          getConversation({
            id: "conv-new",
            title: "AI Title",
            updated: "2026-03-20T12:30:00Z",
          }),
        ],
      });

    const { client, Wrapper } = createQueryClientWrapper();
    const invalidateQueries = vi
      .spyOn(client, "invalidateQueries")
      .mockResolvedValue(undefined);

    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(mocks.getConversations).toHaveBeenCalled();
    });

    act(() => {
      result.current.setInput("Summarize");
      result.current.setPendingFile({
        name: "report.xlsx",
        rows: [{ service: "Netflix" }],
        headers: ["service"],
      });
    });

    await act(async () => {
      await result.current.handleSend();
    });

    expect(mocks.chat).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          role: "user",
          content: expect.stringContaining("[PLANILHA ANEXADA: report.xlsx"),
        }),
      ],
      null,
      expect.stringContaining("[planilha:report.xlsx (1 chat.file_rows)]"),
      expect.any(AbortSignal),
    );
    expect(result.current.messages.at(-1)).toEqual({
      role: "assistant",
      content: "assistant reply",
    });
    expect(result.current.currentConvId).toBe("conv-new");
    await waitFor(() => {
      expect(result.current.conversations[0]).toEqual(
        expect.objectContaining({
          id: "conv-new",
          title: "AI Title",
        }),
      );
    });
    expect(result.current.pendingFile).toBeNull();
    expect(mocks.toastSuccess).toHaveBeenCalledWith("created:Netflix");
    expect(mocks.triggerExportDownload).toHaveBeenCalledWith(
      "json",
      "subscriptions.json",
      [{ id: "sub-1" }],
    );
    expect(mocks.getConversations).toHaveBeenCalledTimes(2);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.subscriptions.all("user-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.dashboard("user-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.categories.all("user-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.paymentMethods.all("user-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.household.all("user-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.currencies.all("user-1"),
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.mainCurrency("user-1"),
    });
  });

  it("loads an existing conversation and closes the sidebar on mobile", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 500,
    });

    const messages: ChatMessage[] = [
      { role: "user", content: "Hello" },
      { role: "assistant", content: "Hi" },
    ];
    mocks.getConversationMessages.mockResolvedValue({
      conversation: getConversation({ id: "conv-2" }),
      messages,
    });

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.handleLoadConversation("conv-2");
    });

    expect(mocks.getConversationMessages).toHaveBeenCalledWith("conv-2");
    expect(result.current.currentConvId).toBe("conv-2");
    expect(result.current.messages).toEqual(messages);
    expect(result.current.sidebarOpen).toBe(false);
    expect(result.current.input).toBe("");
  });

  it("validates and parses spreadsheet uploads", async () => {
    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    const invalidFile = new File(["text"], "note.txt", { type: "text/plain" });
    await act(async () => {
      await result.current.handleFileSelect({
        target: { files: [invalidFile], value: "note.txt" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });
    expect(mocks.toastError).toHaveBeenCalledWith("chat.file_type_error");

    const largeFile = new File(["big"], "report.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    Object.defineProperty(largeFile, "size", { value: 6 * 1024 * 1024 });
    await act(async () => {
      await result.current.handleFileSelect({
        target: { files: [largeFile], value: "report.xlsx" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });
    expect(mocks.toastError).toHaveBeenCalledWith("size:5");

    const validFile = new File(["csv"], "report.csv", { type: "text/csv" });
    Object.defineProperty(validFile, "arrayBuffer", {
      value: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
    mocks.xlsxRead.mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: { A1: "value" } },
    });
    mocks.xlsxSheetToJson.mockReturnValue([{ service: "Netflix", price: 20 }]);

    await act(async () => {
      await result.current.handleFileSelect({
        target: { files: [validFile], value: "report.csv" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    expect(result.current.pendingFile).toEqual({
      name: "report.csv",
      rows: [{ service: "Netflix", price: 20 }],
      headers: ["service", "price"],
    });

    // Test parse error
    mocks.xlsxRead.mockImplementationOnce(() => {
      throw new Error("Parse error");
    });
    
    await act(async () => {
      await result.current.handleFileSelect({
        target: { files: [validFile], value: "error.csv" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });
    expect(mocks.toastError).toHaveBeenCalledWith("chat.file_parse_error");

    // Test undefined file
    await act(async () => {
      await result.current.handleFileSelect({
        target: { files: undefined, value: "none" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });
  });

  it("handles empty send and keydown events", async () => {
    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    // Handle empty send
    result.current.setInput("");
    await act(async () => {
      await result.current.handleSend();
    });
    expect(mocks.chat).not.toHaveBeenCalled();

    // KeyDown without Enter or with ShiftKey
    const preventDefault = vi.fn();
    act(() => {
      result.current.handleKeyDown({
        key: "Enter",
        shiftKey: true,
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>);
    });
    expect(preventDefault).not.toHaveBeenCalled();

    act(() => {
      result.current.handleKeyDown({
        key: "A",
        shiftKey: false,
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>);
    });
    expect(preventDefault).not.toHaveBeenCalled();

    // Enter without ShiftKey
    result.current.setInput("Hello Key");
    await act(async () => {
      result.current.handleKeyDown({
        key: "Enter",
        shiftKey: false,
        preventDefault,
      } as unknown as React.KeyboardEvent<HTMLTextAreaElement>);
    });
    expect(preventDefault).toHaveBeenCalled();
  });

  it("retries the last user message by removing the error response and resending", async () => {
    mocks.chat.mockResolvedValue({
      message: "retry reply",
      conversation_id: "conv-1",
      conversation_title: "Retry Test",
      actions_taken: [],
    });

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    // Manually seed messages: welcome + user + error assistant
    act(() => {
      result.current.setInput("Retry me");
    });

    await act(async () => {
      await result.current.handleSend();
    });

    // Now retry the last error message (index 2)
    await act(async () => {
      await result.current.handleRetry(result.current.messages.length - 1);
    });

    expect(mocks.chat).toHaveBeenCalledTimes(2);
    expect(result.current.messages.at(-1)).toEqual(
      expect.objectContaining({ role: "assistant" }),
    );
  });

  it("handleRetry does nothing when there is no preceding user message", async () => {
    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      // index 0 is the welcome message (assistant), no user message before it
      await result.current.handleRetry(0);
    });

    expect(mocks.chat).not.toHaveBeenCalled();
  });

  it("handleCancel aborts an in-flight request", async () => {
    let resolveChat!: (value: unknown) => void;
    mocks.chat.mockImplementation(
      () => new Promise((resolve) => { resolveChat = resolve; }),
    );

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.setInput("Long running");
    });

    // Start send but do not await
    act(() => {
      void result.current.handleSend();
    });

    act(() => {
      result.current.handleCancel();
    });

    // Resolve the chat promise with an abort error
    const abortError = new Error("AbortError");
    abortError.name = "AbortError";
    act(() => {
      resolveChat(Promise.reject(abortError));
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("handleNewConversation resets state and closes sidebar on mobile", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 500,
    });

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.setInput("some text");
    });

    act(() => {
      result.current.handleNewConversation();
    });

    expect(result.current.input).toBe("");
    expect(result.current.currentConvId).toBeNull();
    expect(result.current.sidebarOpen).toBe(false);
  });

  it("shows error toast when handleLoadConversation fails", async () => {
    mocks.getConversationMessages.mockRejectedValue(new Error("network error"));

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.handleLoadConversation("conv-fail");
    });

    expect(mocks.toastError).toHaveBeenCalledWith("chat.error_generic");
  });

  it("shows error toast when handleConfirmDeleteConversation fails", async () => {
    mocks.getConversations.mockResolvedValue({
      conversations: [getConversation({ id: "conv-err", title: "Error conv" })],
    });
    mocks.deleteConversation.mockRejectedValue(new Error("delete failed"));

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(1);
    });

    act(() => {
      result.current.handleDeleteConversation(
        "conv-err",
        { stopPropagation: vi.fn() } as unknown as React.MouseEvent,
      );
    });

    await act(async () => {
      await result.current.handleConfirmDeleteConversation();
    });

    expect(mocks.toastError).toHaveBeenCalledWith("chat.error_generic");
  });

  it("shows error toast when handleConfirmRename fails", async () => {
    mocks.renameConversation.mockRejectedValue(new Error("rename failed"));
    mocks.getConversations.mockResolvedValue({
      conversations: [getConversation({ id: "conv-r", title: "Old" })],
    });

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    await waitFor(() => expect(result.current.conversations).toHaveLength(1));

    act(() => {
      result.current.handleStartRename(
        "conv-r",
        "Old",
        { stopPropagation: vi.fn() } as unknown as React.MouseEvent,
      );
    });

    await act(async () => {
      await result.current.handleConfirmRename();
    });

    expect(mocks.toastError).toHaveBeenCalledWith("chat.error_generic");
  });

  it("shows error toast when spreadsheet file is empty", async () => {
    const emptyFile = new File(["data"], "empty.csv", { type: "text/csv" });
    Object.defineProperty(emptyFile, "arrayBuffer", {
      value: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    });
    mocks.xlsxRead.mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: {} },
    });
    mocks.xlsxSheetToJson.mockReturnValue([]); // empty rows

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    await act(async () => {
      await result.current.handleFileSelect({
        target: { files: [emptyFile], value: "empty.csv" },
      } as unknown as React.ChangeEvent<HTMLInputElement>);
    });

    expect(mocks.toastError).toHaveBeenCalledWith("chat.file_empty_error");
  });

  it("handleSend with only pendingFile and no text sends the file content", async () => {
    mocks.chat.mockResolvedValue({
      message: "file processed",
      conversation_id: "conv-file",
      conversation_title: "File Conv",
      actions_taken: [],
    });
    mocks.getConversations.mockResolvedValue({ conversations: [] });

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.setPendingFile({
        name: "data.csv",
        rows: [{ a: 1 }],
        headers: ["a"],
      });
    });

    await act(async () => {
      await result.current.handleSend();
    });

    expect(mocks.chat).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          role: "user",
          content: expect.stringContaining("PLANILHA ANEXADA"),
        }),
      ]),
      null,
      expect.any(String),
      expect.any(AbortSignal),
    );
  });

  it("handleConfirmRename clears editingConvId when editTitle is blank", async () => {
    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    act(() => {
      result.current.setEditingConvId("conv-x");
      result.current.setEditTitle("   "); // blank
    });

    await act(async () => {
      await result.current.handleConfirmRename();
    });

    expect(result.current.editingConvId).toBeNull();
    expect(mocks.renameConversation).not.toHaveBeenCalled();
  });

  it("handleConfirmDeleteConversation resets state when no pendingDeleteConvId", async () => {
    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    // pendingDeleteConvId is null by default
    await act(async () => {
      await result.current.handleConfirmDeleteConversation();
    });

    expect(mocks.deleteConversation).not.toHaveBeenCalled();
  });

  it("deletes and renames conversations while keeping local state in sync", async () => {
    mocks.getConversations.mockResolvedValue({
      conversations: [
        getConversation({
          id: "conv-1",
          title: "First",
          updated: "2026-03-20T09:00:00Z",
        }),
      ],
    });

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useChatPageController(), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.conversations).toHaveLength(1);
    });

    const stopPropagation = vi.fn();

    act(() => {
      result.current.handleDeleteConversation(
        "conv-1",
        { stopPropagation } as unknown as React.MouseEvent,
      );
    });
    expect(stopPropagation).toHaveBeenCalled();
    expect(result.current.pendingDeleteConvId).toBe("conv-1");

    await act(async () => {
      await result.current.handleConfirmDeleteConversation();
    });

    expect(mocks.deleteConversation).toHaveBeenCalledWith("conv-1");
    expect(result.current.conversations).toEqual([]);
    expect(result.current.pendingDeleteConvId).toBeNull();

    mocks.getConversations.mockResolvedValue({
      conversations: [
        getConversation({
          id: "conv-2",
          title: "Old title",
          updated: "2026-03-20T10:00:00Z",
        }),
      ],
    });

    await act(async () => {
      await result.current.refreshConversations();
    });

    act(() => {
      result.current.handleStartRename(
        "conv-2",
        "Old title",
        { stopPropagation } as unknown as React.MouseEvent,
      );
      result.current.setEditTitle("New title");
    });

    await act(async () => {
      await result.current.handleConfirmRename();
    });

    expect(mocks.renameConversation).toHaveBeenCalledWith("conv-2", "New title");
    expect(result.current.conversations[0]?.title).toBe("New title");
    expect(result.current.editingConvId).toBeNull();
  });
});
