import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { ChatHeader } from "./ChatHeader";

describe("ChatHeader", () => {
  it("renders the title and subtitle via i18n keys", () => {
    render(
      <ChatHeader onNewConversation={vi.fn()} onToggleSidebar={vi.fn()} />,
    );
    expect(screen.getByText("chat.title")).toBeInTheDocument();
    expect(screen.getByText("chat.subtitle")).toBeInTheDocument();
  });

  it("calls onToggleSidebar when the panel-left button is clicked", () => {
    const onToggleSidebar = vi.fn();
    render(
      <ChatHeader onNewConversation={vi.fn()} onToggleSidebar={onToggleSidebar} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "chat.conversations_title" }));
    expect(onToggleSidebar).toHaveBeenCalledOnce();
  });

  it("calls onNewConversation when the new-conversation button is clicked", () => {
    const onNewConversation = vi.fn();
    render(
      <ChatHeader onNewConversation={onNewConversation} onToggleSidebar={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /chat\.new_conversation/i }));
    expect(onNewConversation).toHaveBeenCalledOnce();
  });
});
