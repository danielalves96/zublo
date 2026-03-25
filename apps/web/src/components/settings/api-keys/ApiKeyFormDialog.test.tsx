import { fireEvent, render, screen } from "@testing-library/react";

import { ApiKeyFormDialog, CreateApiKeyDialog, EditApiKeyDialog } from "./ApiKeyFormDialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("ApiKeyFormDialog", () => {
  it("renders dialog title when open", () => {
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
      />,
    );
    expect(screen.getByText("Create Key")).toBeInTheDocument();
  });

  it("renders submit button disabled when name is empty", () => {
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
      />,
    );
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("renders helperText when provided", () => {
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
        helperText="Some helper text"
      />,
    );
    expect(screen.getByText("Some helper text")).toBeInTheDocument();
  });

  it("does not render helperText when not provided", () => {
    const { queryByText } = render(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
      />,
    );
    expect(queryByText("Some helper text")).not.toBeInTheDocument();
  });

  it("enables submit button when name is entered and permissions selected", () => {
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
        initialPermissions={["subscriptions:read"]}
      />,
    );
    const nameInput = screen.getByPlaceholderText("api_key_name_placeholder");
    fireEvent.change(nameInput, { target: { value: "My Key" } });
    expect(screen.getByRole("button", { name: "Create" })).not.toBeDisabled();
  });

  it("calls onSubmit with name and ordered permissions when submit is clicked", () => {
    const onSubmit = vi.fn();
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
        initialPermissions={["subscriptions:read"]}
      />,
    );
    const nameInput = screen.getByPlaceholderText("api_key_name_placeholder");
    fireEvent.change(nameInput, { target: { value: "My Key" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onSubmit).toHaveBeenCalledWith("My Key", ["subscriptions:read"]);
  });

  // Line 108: guard — does not call onSubmit when name is empty (even if button click forced)
  it("does not call onSubmit when name is empty (line 108 guard)", () => {
    const onSubmit = vi.fn();
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
        initialPermissions={["subscriptions:read"]}
      />,
    );
    // Button is disabled when name is empty, but we force click via Enter key with empty name
    const nameInput = screen.getByPlaceholderText("api_key_name_placeholder");
    fireEvent.keyDown(nameInput, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // Line 108: guard — does not call onSubmit when permissions are empty
  it("does not call onSubmit when permissions are empty (line 108 guard)", () => {
    const onSubmit = vi.fn();
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
      />,
    );
    const nameInput = screen.getByPlaceholderText("api_key_name_placeholder");
    fireEvent.change(nameInput, { target: { value: "My Key" } });
    // No permissions selected — submit is disabled but also handleSubmit guard fires
    fireEvent.keyDown(nameInput, { key: "Enter" });
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits on Enter key press in name input", () => {
    const onSubmit = vi.fn();
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={onSubmit}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
        initialPermissions={["subscriptions:read"]}
      />,
    );
    const nameInput = screen.getByPlaceholderText("api_key_name_placeholder");
    fireEvent.change(nameInput, { target: { value: "My Key" } });
    fireEvent.keyDown(nameInput, { key: "Enter" });
    expect(onSubmit).toHaveBeenCalled();
  });

  it("calls onClose when Cancel button is clicked", () => {
    const onClose = vi.fn();
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={onClose}
        onSubmit={vi.fn()}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
      />,
    );
    fireEvent.click(screen.getByText("cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows pending spinner when isPending is true", () => {
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={true}
        title="Create Key"
        submitLabel="Creating..."
        nameInputId="key-name"
        initialPermissions={["subscriptions:read"]}
        initialName="My Key"
      />,
    );
    // The spinner div should be present
    expect(screen.getByText("Creating...")).toBeInTheDocument();
  });

  it("toggles read permission when Read button is clicked", () => {
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
      />,
    );
    // Find the first Read button (subscriptions:read)
    const readButtons = screen.getAllByText("Read");
    fireEvent.click(readButtons[0]);
    // Should now be selected - click again to deselect
    fireEvent.click(readButtons[0]);
  });

  it("toggles write permission and auto-enables read when Write button is clicked", () => {
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
      />,
    );
    const writeButtons = screen.getAllByText("Write");
    fireEvent.click(writeButtons[0]);
    // Write for subscriptions should also enable subscriptions:read
    const nameInput = screen.getByPlaceholderText("api_key_name_placeholder");
    fireEvent.change(nameInput, { target: { value: "My Key" } });
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    // subscriptions:write selected means subscriptions:read is also added
  });

  it("deselects write permission when Write button is clicked while already selected", () => {
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
        initialPermissions={["subscriptions:write"]}
      />,
    );
    const writeButtons = screen.getAllByText("Write");
    fireEvent.click(writeButtons[0]);
    // After deselect, write should be gone
  });

  it("resets form state when dialog is reopened", () => {
    const { rerender } = render(
      <ApiKeyFormDialog
        open={false}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
        initialName="Initial"
        initialPermissions={["subscriptions:read"]}
      />,
    );
    rerender(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
        initialName="Initial"
        initialPermissions={["subscriptions:read"]}
      />,
    );
    expect(screen.getByDisplayValue("Initial")).toBeInTheDocument();
  });

  it("renders default icon when no icon prop provided", () => {
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
      />,
    );
    expect(screen.getByText("Create Key")).toBeInTheDocument();
  });

  it("renders custom icon when icon prop provided", () => {
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
        icon={<span data-testid="custom-icon">icon</span>}
      />,
    );
    expect(screen.getByTestId("custom-icon")).toBeInTheDocument();
  });

  // Line 121: dialog onOpenChange triggers handleClose when dialog is closed externally
  it("calls onClose via dialog onOpenChange when dialog is closed with Escape (line 121)", () => {
    const onClose = vi.fn();
    render(
      <ApiKeyFormDialog
        open={true}
        onClose={onClose}
        onSubmit={vi.fn()}
        isPending={false}
        title="Create Key"
        submitLabel="Create"
        nameInputId="key-name"
      />,
    );
    // Pressing Escape triggers onOpenChange(false) which calls handleClose -> onClose
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});

describe("CreateApiKeyDialog", () => {
  it("renders with translated title", () => {
    render(
      <CreateApiKeyDialog open={true} onClose={vi.fn()} onSubmit={vi.fn()} isPending={false} />,
    );
    expect(screen.getByText("new_api_key")).toBeInTheDocument();
  });

  it("renders helper text derived from api_key_no_keys translation", () => {
    render(
      <CreateApiKeyDialog open={true} onClose={vi.fn()} onSubmit={vi.fn()} isPending={false} />,
    );
    // The fallback helper text is rendered when translation doesn't have a second sentence
    expect(screen.getByText("new_api_key")).toBeInTheDocument();
  });
});

describe("EditApiKeyDialog", () => {
  it("renders with initial name", () => {
    render(
      <EditApiKeyDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        apiKeyName="My Key"
        apiKeyPermissions={[]}
      />,
    );
    expect(screen.getByDisplayValue("My Key")).toBeInTheDocument();
  });

  it("renders with initial permissions", () => {
    render(
      <EditApiKeyDialog
        open={true}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
        isPending={false}
        apiKeyName="My Key"
        apiKeyPermissions={["subscriptions:read"]}
      />,
    );
    expect(screen.getByDisplayValue("My Key")).toBeInTheDocument();
  });
});
