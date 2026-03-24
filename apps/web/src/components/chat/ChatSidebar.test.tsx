import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { ChatSidebar } from "./ChatSidebar";

describe("ChatSidebar", () => {
  it("renders loading and empty states", () => {
    const { rerender } = render(
      <ChatSidebar
        conversationGroups={[]}
        convsLoading
        currentConvId={null}
        editInputRef={createRef<HTMLInputElement>()}
        editTitle=""
        editingConvId={null}
        hasConversations={false}
        onClose={vi.fn()}
        onConfirmRename={vi.fn()}
        onDeleteConversation={vi.fn()}
        onEditTitleChange={vi.fn()}
        onLoadConversation={vi.fn()}
        onNewConversation={vi.fn()}
        onStartRename={vi.fn()}
        onStopRename={vi.fn()}
        sidebarOpen
      />,
    );

    expect(screen.getByText("chat.conversations_title")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /chat.new_conversation/i })).toBeInTheDocument();

    rerender(
      <ChatSidebar
        conversationGroups={[]}
        convsLoading={false}
        currentConvId={null}
        editInputRef={createRef<HTMLInputElement>()}
        editTitle=""
        editingConvId={null}
        hasConversations={false}
        onClose={vi.fn()}
        onConfirmRename={vi.fn()}
        onDeleteConversation={vi.fn()}
        onEditTitleChange={vi.fn()}
        onLoadConversation={vi.fn()}
        onNewConversation={vi.fn()}
        onStartRename={vi.fn()}
        onStopRename={vi.fn()}
        sidebarOpen
      />,
    );

    expect(screen.getByText("chat.no_conversations")).toBeInTheDocument();
  });

  it("applies hidden class when sidebar is closed", () => {
    const { container } = render(
      <ChatSidebar
        conversationGroups={[]}
        convsLoading={false}
        currentConvId={null}
        editInputRef={createRef<HTMLInputElement>()}
        editTitle=""
        editingConvId={null}
        hasConversations={false}
        onClose={vi.fn()}
        onConfirmRename={vi.fn()}
        onDeleteConversation={vi.fn()}
        onEditTitleChange={vi.fn()}
        onLoadConversation={vi.fn()}
        onNewConversation={vi.fn()}
        onStartRename={vi.fn()}
        onStopRename={vi.fn()}
        sidebarOpen={false}
      />,
    );
    expect(container.firstChild).toHaveClass("hidden");
  });

  it("handles conversation actions and inline renaming", () => {
    const onClose = vi.fn();
    const onConfirmRename = vi.fn();
    const onDeleteConversation = vi.fn();
    const onEditTitleChange = vi.fn();
    const onLoadConversation = vi.fn();
    const onNewConversation = vi.fn();
    const onStartRename = vi.fn();
    const onStopRename = vi.fn();

    const { rerender } = render(
      <ChatSidebar
        conversationGroups={[
          {
            label: "Today",
            items: [
              { id: "conv-1", title: "First conversation" },
              { id: "conv-2", title: "Second conversation" },
            ],
          },
        ]}
        convsLoading={false}
        currentConvId="conv-1"
        editInputRef={createRef<HTMLInputElement>()}
        editTitle=""
        editingConvId={null}
        hasConversations
        onClose={onClose}
        onConfirmRename={onConfirmRename}
        onDeleteConversation={onDeleteConversation}
        onEditTitleChange={onEditTitleChange}
        onLoadConversation={onLoadConversation}
        onNewConversation={onNewConversation}
        onStartRename={onStartRename}
        onStopRename={onStopRename}
        sidebarOpen
      />,
    );

    fireEvent.click(screen.getByText("First conversation"));
    fireEvent.click(screen.getByRole("button", { name: "" }));
    fireEvent.click(screen.getByRole("button", { name: /chat.new_conversation/i }));

    const buttons = screen.getAllByTitle("chat.rename_placeholder");
    fireEvent.click(buttons[0]);
    fireEvent.click(screen.getAllByTitle("chat.delete_conversation_confirm")[0]);

    expect(onLoadConversation).toHaveBeenCalledWith("conv-1");
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onNewConversation).toHaveBeenCalledTimes(1);
    expect(onStartRename).toHaveBeenCalled();
    expect(onDeleteConversation).toHaveBeenCalled();

    rerender(
      <ChatSidebar
        conversationGroups={[
          {
            label: "Today",
            items: [{ id: "conv-1", title: "First conversation" }],
          },
        ]}
        convsLoading={false}
        currentConvId="conv-1"
        editInputRef={createRef<HTMLInputElement>()}
        editTitle="Updated title"
        editingConvId="conv-1"
        hasConversations
        onClose={onClose}
        onConfirmRename={onConfirmRename}
        onDeleteConversation={onDeleteConversation}
        onEditTitleChange={onEditTitleChange}
        onLoadConversation={onLoadConversation}
        onNewConversation={onNewConversation}
        onStartRename={onStartRename}
        onStopRename={onStopRename}
        sidebarOpen
      />,
    );

    const input = screen.getByPlaceholderText("chat.rename_placeholder");
    fireEvent.change(input, { target: { value: "Renamed" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Escape" });
    fireEvent.blur(input);
    fireEvent.mouseDown(input.parentElement!.querySelector("button")!);

    expect(onEditTitleChange).toHaveBeenCalledWith("Renamed");
    expect(onConfirmRename).toHaveBeenCalledTimes(3);
    expect(onStopRename).toHaveBeenCalledTimes(1);
  });
});
