import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRef } from "react";

import type { PendingFile } from "@/components/chat/chat.types";

import { ChatComposer } from "./ChatComposer";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("ChatComposer", () => {
  function renderComponent({
    input = "",
    isLoading = false,
    pendingFile = null,
  }: {
    input?: string;
    isLoading?: boolean;
    pendingFile?: PendingFile | null;
  } = {}) {
    const props = {
      fileInputRef: createRef<HTMLInputElement>(),
      input,
      isLoading,
      onCancel: vi.fn(),
      onFileSelect: vi.fn(),
      onInputChange: vi.fn(),
      onKeyDown: vi.fn(),
      onRemovePendingFile: vi.fn(),
      onSubmit: vi.fn((event: React.FormEvent<HTMLFormElement>) =>
        event.preventDefault(),
      ),
      pendingFile,
      textareaRef: createRef<HTMLTextAreaElement>(),
    };

    render(<ChatComposer {...props} />);
    return props;
  }

  it("renders the pending file state and lets the user remove it", async () => {
    const pendingFile = {
      name: "subscriptions.xlsx",
      rows: [{ id: 1 }],
      summary: { rows: 1, columns: 3 },
    } as unknown as PendingFile;

    const props = renderComponent({ pendingFile });

    expect(screen.getByText("subscriptions.xlsx")).toBeInTheDocument();
    expect(screen.getByText("1 chat.file_rows")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("chat.file_add_note")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "chat.file_remove" }));
    expect(props.onRemovePendingFile).toHaveBeenCalledTimes(1);
  });

  it("triggers the hidden file input from the attach button", async () => {
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, "click");
    renderComponent();

    await userEvent.click(screen.getByRole("button", { name: "chat.file_attach_hint" }));

    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();
  });

  it("forwards textarea changes and keeps submit disabled without content", async () => {
    const props = renderComponent();

    await userEvent.type(screen.getByPlaceholderText("chat.placeholder"), "hello");

    expect(props.onInputChange).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Enviar" })).toBeDisabled();
  });

  it("shows the cancel action while loading", async () => {
    const props = renderComponent({ isLoading: true, input: "draft" });

    expect(screen.queryByRole("button", { name: "Enviar" })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it("enables submit when there is a message to send", () => {
    renderComponent({ input: "ready" });
    expect(screen.getByRole("button", { name: "Enviar" })).toBeEnabled();
  });
});
