import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ConfirmDialog } from "./confirm-dialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

describe("ConfirmDialog", () => {
  it("renders the title and description when open", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="Are you sure?"
        description="This action cannot be undone."
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
    expect(
      screen.getByText("This action cannot be undone."),
    ).toBeInTheDocument();
  });

  it("does not render content when closed", () => {
    render(
      <ConfirmDialog
        open={false}
        onOpenChange={() => {}}
        title="Hidden"
        description="D"
        onConfirm={() => {}}
      />,
    );
    expect(screen.queryByText("Hidden")).not.toBeInTheDocument();
  });

  it("shows t('cancel') on the cancel button", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="T"
        description="D"
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText("cancel")).toBeInTheDocument();
  });

  it("defaults the confirm label to t('delete')", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="T"
        description="D"
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText("delete")).toBeInTheDocument();
  });

  it("renders the provided confirmLabel instead of the default", () => {
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="T"
        description="D"
        confirmLabel="Remove"
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByText("Remove")).toBeInTheDocument();
    expect(screen.queryByText("delete")).not.toBeInTheDocument();
  });

  it("calls onConfirm when the action button is clicked", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="T"
        description="D"
        onConfirm={onConfirm}
      />,
    );
    await userEvent.click(screen.getByText("delete"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onConfirm with the custom confirmLabel button", async () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={() => {}}
        title="T"
        description="D"
        confirmLabel="Yes, remove"
        onConfirm={onConfirm}
      />,
    );
    await userEvent.click(screen.getByText("Yes, remove"));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("calls onOpenChange when cancel button is clicked", async () => {
    const onOpenChange = vi.fn();
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="T"
        description="D"
        onConfirm={() => {}}
      />,
    );
    await userEvent.click(screen.getByText("cancel"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
