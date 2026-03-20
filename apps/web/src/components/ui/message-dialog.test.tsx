import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MessageDialog } from "./message-dialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("MessageDialog", () => {
  it("renders the title and description when open", () => {
    render(
      <MessageDialog
        open
        onClose={() => {}}
        type="success"
        title="All good!"
        description="Operation completed successfully."
      />,
    );
    expect(screen.getByText("All good!")).toBeInTheDocument();
    expect(
      screen.getByText("Operation completed successfully."),
    ).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(
      <MessageDialog
        open={false}
        onClose={() => {}}
        type="success"
        title="Hidden"
        description="D"
      />,
    );
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("applies green text class on the title for success type", () => {
    render(
      <MessageDialog
        open
        onClose={() => {}}
        type="success"
        title="Done"
        description=""
      />,
    );
    expect(screen.getByRole("heading", { name: /Done/ })).toHaveClass(
      "text-green-600",
    );
  });

  it("applies destructive text class on the title for error type", () => {
    render(
      <MessageDialog
        open
        onClose={() => {}}
        type="error"
        title="Oops"
        description=""
      />,
    );
    expect(screen.getByRole("heading", { name: /Oops/ })).toHaveClass(
      "text-destructive",
    );
  });

  it("renders a default (primary) button for success type", () => {
    render(
      <MessageDialog
        open
        onClose={() => {}}
        type="success"
        title="T"
        description="D"
      />,
    );
    expect(screen.getByText("ok")).toHaveClass("bg-primary");
  });

  it("renders a destructive button for error type", () => {
    render(
      <MessageDialog
        open
        onClose={() => {}}
        type="error"
        title="T"
        description="D"
      />,
    );
    expect(screen.getByText("ok")).toHaveClass("bg-destructive");
  });

  it("calls onClose when the ok button is clicked", async () => {
    const onClose = vi.fn();
    render(
      <MessageDialog
        open
        onClose={onClose}
        type="success"
        title="T"
        description="D"
      />,
    );
    await userEvent.click(screen.getByText("ok"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the dialog is dismissed via Escape", async () => {
    const onClose = vi.fn();
    render(
      <MessageDialog
        open
        onClose={onClose}
        type="error"
        title="T"
        description="D"
      />,
    );
    await userEvent.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
