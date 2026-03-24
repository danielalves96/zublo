import { fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  setPendingDeleteConvId: vi.fn(),
  setSidebarOpen: vi.fn(),
  setEditingConvId: vi.fn(),
  setEditTitle: vi.fn(),
  setInput: vi.fn(),
  setPendingFile: vi.fn(),
  handleConfirmDeleteConversation: vi.fn(),
  handleCancel: vi.fn(),
  handleDeleteConversation: vi.fn(),
  handleFileSelect: vi.fn(),
  handleKeyDown: vi.fn(),
  handleLoadConversation: vi.fn(),
  handleNewConversation: vi.fn(),
  handleRetry: vi.fn(),
  handleSend: vi.fn(),
  handleStartRename: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/components/chat/useChatPageController", () => ({
  useChatPageController: () => ({
    avatarUrl: "https://cdn.example.com/avatar.png",
    conversationGroups: [{ id: "today", title: "Today", items: [] }],
    conversations: [{ id: "conv-1" }],
    convsLoading: false,
    currentConvId: "conv-1",
    editInputRef: { current: null },
    editTitle: "Edit me",
    editingConvId: "conv-1",
    fileInputRef: { current: null },
    handleCancel: mocks.handleCancel,
    handleConfirmDeleteConversation: mocks.handleConfirmDeleteConversation,
    handleConfirmRename: vi.fn(),
    handleDeleteConversation: mocks.handleDeleteConversation,
    handleFileSelect: mocks.handleFileSelect,
    handleKeyDown: mocks.handleKeyDown,
    handleLoadConversation: mocks.handleLoadConversation,
    handleNewConversation: mocks.handleNewConversation,
    handleRetry: mocks.handleRetry,
    handleSend: mocks.handleSend,
    handleStartRename: mocks.handleStartRename,
    hasUserSentMessage: true,
    input: "hello",
    isLoading: false,
    messages: [{ role: "assistant", content: "Hi" }],
    pendingDeleteConvId: "conv-1",
    pendingFile: { name: "sheet.csv", rows: [], headers: [] },
    scrollRef: { current: null },
    setEditTitle: mocks.setEditTitle,
    setEditingConvId: mocks.setEditingConvId,
    setInput: mocks.setInput,
    setPendingDeleteConvId: mocks.setPendingDeleteConvId,
    setPendingFile: mocks.setPendingFile,
    setSidebarOpen: mocks.setSidebarOpen,
    sidebarOpen: true,
    textareaRef: { current: null },
    user: { name: "Daniel" },
  }),
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({
    open,
    onOpenChange,
    onConfirm,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: () => void;
  }) =>
    open ? (
      <div>
        <button type="button" onClick={() => onOpenChange(false)}>
          close-dialog
        </button>
        <button type="button" onClick={() => onOpenChange(true)}>
          reopen-dialog
        </button>
        <button type="button" onClick={onConfirm}>
          confirm-dialog
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/chat/ChatSidebar", () => ({
  ChatSidebar: ({
    onClose,
    onLoadConversation,
    onNewConversation,
    onStopRename,
  }: {
    onClose: () => void;
    onLoadConversation: (id: string) => void;
    onNewConversation: () => void;
    onStopRename: () => void;
  }) => (
    <div>
      <button type="button" onClick={onClose}>
        close-sidebar
      </button>
      <button type="button" onClick={() => onLoadConversation("conv-2")}>
        load-conversation
      </button>
      <button type="button" onClick={onNewConversation}>
        new-conversation
      </button>
      <button type="button" onClick={onStopRename}>
        stop-rename
      </button>
    </div>
  ),
}));

vi.mock("@/components/chat/ChatHeader", () => ({
  ChatHeader: ({
    onNewConversation,
    onToggleSidebar,
  }: {
    onNewConversation: () => void;
    onToggleSidebar: () => void;
  }) => (
    <div>
      <button type="button" onClick={onNewConversation}>
        header-new
      </button>
      <button type="button" onClick={onToggleSidebar}>
        toggle-sidebar
      </button>
    </div>
  ),
}));

vi.mock("@/components/chat/ChatMessagesPanel", () => ({
  ChatMessagesPanel: ({
    onRetry,
    onSuggestedPrompt,
  }: {
    onRetry: (index: number) => void;
    onSuggestedPrompt: (prompt: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onRetry(1)}>
        retry-message
      </button>
      <button type="button" onClick={() => onSuggestedPrompt("suggested")}>
        suggested-prompt
      </button>
    </div>
  ),
}));

vi.mock("@/components/chat/ChatComposer", () => ({
  ChatComposer: ({
    onCancel,
    onInputChange,
    onRemovePendingFile,
    onSubmit,
  }: {
    onCancel: () => void;
    onInputChange: (value: string) => void;
    onRemovePendingFile: () => void;
    onSubmit: (event: { preventDefault: () => void }) => void;
  }) => (
    <div>
      <button type="button" onClick={onCancel}>
        cancel-send
      </button>
      <button type="button" onClick={() => onInputChange("updated")}>
        change-input
      </button>
      <button type="button" onClick={onRemovePendingFile}>
        remove-file
      </button>
      <button
        type="button"
        onClick={() => onSubmit({ preventDefault: vi.fn() })}
      >
        submit-form
      </button>
    </div>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { ChatPage } from "./ChatPage";

describe("ChatPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("wires dialog, overlay, and chat child actions through the page controller", () => {
    const { container } = render(<ChatPage />);

    fireEvent.click(screen.getByText("close-dialog"));
    fireEvent.click(screen.getByText("reopen-dialog"));
    fireEvent.click(screen.getByText("confirm-dialog"));
    fireEvent.click(container.querySelector(".fixed.inset-0.z-20")!);
    fireEvent.click(screen.getByText("close-sidebar"));
    fireEvent.click(screen.getByText("load-conversation"));
    fireEvent.click(screen.getByText("new-conversation"));
    fireEvent.click(screen.getByText("stop-rename"));
    fireEvent.click(screen.getByText("header-new"));
    fireEvent.click(screen.getByText("toggle-sidebar"));
    fireEvent.click(screen.getByText("retry-message"));
    fireEvent.click(screen.getByText("suggested-prompt"));
    fireEvent.click(screen.getByText("cancel-send"));
    fireEvent.click(screen.getByText("change-input"));
    fireEvent.click(screen.getByText("remove-file"));
    fireEvent.click(screen.getByText("submit-form"));

    expect(mocks.setPendingDeleteConvId).toHaveBeenCalledWith(null);
    expect(mocks.handleConfirmDeleteConversation).toHaveBeenCalledTimes(1);
    expect(mocks.setSidebarOpen).toHaveBeenCalledWith(false);
    expect(mocks.handleLoadConversation).toHaveBeenCalledWith("conv-2");
    expect(mocks.setEditingConvId).toHaveBeenCalledWith(null);
    expect(mocks.handleNewConversation).toHaveBeenCalledTimes(2);
    expect(mocks.setSidebarOpen).toHaveBeenCalledWith(expect.any(Function));

    const updateFn = mocks.setSidebarOpen.mock.calls.find(
      (args) => typeof args[0] === "function"
    )?.[0];
    expect(updateFn).toBeDefined();
    expect(updateFn(true)).toBe(false);
    expect(updateFn(false)).toBe(true);

    expect(mocks.handleRetry).toHaveBeenCalledWith(1);
    expect(mocks.handleSend).toHaveBeenCalledWith("suggested");
    expect(mocks.handleCancel).toHaveBeenCalledTimes(1);
    expect(mocks.setInput).toHaveBeenCalledWith("updated");
    expect(mocks.setPendingFile).toHaveBeenCalledWith(null);
    expect(mocks.handleSend).toHaveBeenCalledTimes(2);
  });
});
