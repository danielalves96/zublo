import { fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  extractFileChip: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        "chat.ai_thinking": "AI thinking",
        prompt_one: "Prompt one",
        prompt_two: "Prompt two",
      };
      return map[key] ?? key;
    },
  }),
}));

vi.mock("framer-motion", () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({ children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock("@/components/chat/constants", () => ({
  SUGGESTED_PROMPTS: ["prompt_one", "prompt_two"],
}));

vi.mock("@/components/chat/utils", () => ({
  extractFileChip: mocks.extractFileChip,
}));

import { ChatMessagesPanel } from "./ChatMessagesPanel";

describe("ChatMessagesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.extractFileChip.mockImplementation((content: string) =>
      content.includes("[planilha")
        ? { text: "message text", chip: "report.csv (3 rows)" }
        : null,
    );
  });

  it("renders user chips, assistant markdown, and retry for the last error", () => {
    const onRetry = vi.fn();

    render(
      <ChatMessagesPanel
        avatarUrl="https://cdn.example.com/avatar.png"
        hasUserSentMessage
        isLoading={false}
        messages={[
          {
            role: "user",
            content: "[planilha:report.csv (3 rows)]",
          },
          {
            role: "assistant",
            content: "**hello**\n\n- item",
            isError: true,
          },
        ]}
        onRetry={onRetry}
        onSuggestedPrompt={vi.fn()}
        scrollRef={{ current: null }}
        userName="Daniel"
      />,
    );

    expect(screen.getByText("message text")).toBeInTheDocument();
    expect(screen.getByText("report.csv (3 rows)")).toBeInTheDocument();
    expect(screen.getByAltText("Daniel")).toHaveAttribute(
      "src",
      "https://cdn.example.com/avatar.png",
    );
    expect(screen.getByText("hello")).toBeInTheDocument();
    expect(screen.getByText("item")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Tentar Novamente" }));

    expect(onRetry).toHaveBeenCalledWith(1);
  });

  it("renders loading and suggested prompts when the conversation has not started", () => {
    const onSuggestedPrompt = vi.fn();

    const { rerender } = render(
      <ChatMessagesPanel
        avatarUrl={null}
        hasUserSentMessage={false}
        isLoading={false}
        messages={[{ role: "assistant", content: "chat.welcome" }]}
        onRetry={vi.fn()}
        onSuggestedPrompt={onSuggestedPrompt}
        scrollRef={{ current: null }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Prompt one" }));
    fireEvent.click(screen.getByRole("button", { name: "Prompt two" }));

    expect(onSuggestedPrompt).toHaveBeenCalledWith("Prompt one");
    expect(onSuggestedPrompt).toHaveBeenCalledWith("Prompt two");

    rerender(
      <ChatMessagesPanel
        avatarUrl={null}
        hasUserSentMessage
        isLoading
        messages={[{ role: "assistant", content: "chat.welcome" }]}
        onRetry={vi.fn()}
        onSuggestedPrompt={onSuggestedPrompt}
        scrollRef={{ current: null }}
      />,
    );

    expect(screen.getByLabelText("AI thinking")).toBeInTheDocument();
  });

  it("renders complex markdown elements from bot", () => {
    const markdownContent = `
1. Ordered
*Emphasized*
\`Inline code\`
\`\`\`
Block code
\`\`\`
# Heading 1
## Heading 2
### Heading 3
| Header |
| ------ |
| Cell   |
> Blockquote
    `;

    render(
      <ChatMessagesPanel
        avatarUrl={null}
        hasUserSentMessage={true}
        isLoading={false}
        messages={[
          {
            role: "assistant", // it checks for role !== "user"
            content: markdownContent,
          },
        ]}
        onRetry={vi.fn()}
        onSuggestedPrompt={vi.fn()}
        scrollRef={vi.fn() as any}
      />,
    );

    expect(screen.getByText("Ordered")).toBeInTheDocument();
    expect(screen.getByText("Emphasized")).toBeInTheDocument();
    expect(screen.getByText("Inline code")).toBeInTheDocument();
    expect(screen.getByText("Block code")).toBeInTheDocument();
    expect(screen.getByText("Heading 1")).toBeInTheDocument();
    expect(screen.getByText("Heading 2")).toBeInTheDocument();
    expect(screen.getByText("Heading 3")).toBeInTheDocument();
    expect(screen.getByText("Header")).toBeInTheDocument();
    expect(screen.getByText("Cell")).toBeInTheDocument();
    expect(screen.getByText("Blockquote")).toBeInTheDocument();
  });
});
