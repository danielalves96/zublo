import { render, screen } from "@testing-library/react";

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
});

describe("CreateApiKeyDialog", () => {
  it("renders with translated title", () => {
    render(
      <CreateApiKeyDialog open={true} onClose={vi.fn()} onSubmit={vi.fn()} isPending={false} />,
    );
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
});
