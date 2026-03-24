import { fireEvent, render, screen } from "@testing-library/react";

import { ApiKeyListCard } from "./ApiKeyListCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/components/settings/api-keys/PermissionBadge", () => ({
  PermissionBadge: ({ perm }: any) => <span>{perm}</span>,
}));

const mockKey = {
  id: "k1",
  name: "Test Key",
  key_prefix: "wk_abc",
  permissions: ["subscriptions:read" as const],
  created: "2025-01-01T00:00:00Z",
  last_used_at: null,
};

const mockKeyWithLastUsed = {
  id: "k2",
  name: "Active Key",
  key_prefix: "wk_xyz",
  permissions: ["subscriptions:write" as const],
  created: "2025-01-01T00:00:00Z",
  last_used_at: "2025-06-01T00:00:00Z",
};

describe("ApiKeyListCard", () => {
  it("renders empty state when no keys", () => {
    render(<ApiKeyListCard keys={[]} isLoading={false} onCreate={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("api_key_no_keys")).toBeInTheDocument();
  });

  it("renders key row with name and prefix", () => {
    render(<ApiKeyListCard keys={[mockKey as any]} isLoading={false} onCreate={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Test Key")).toBeInTheDocument();
    expect(screen.getByText("wk_abc")).toBeInTheDocument();
  });

  it("calls onCreate when new api key button clicked", () => {
    const onCreate = vi.fn();
    render(<ApiKeyListCard keys={[]} isLoading={false} onCreate={onCreate} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    const newKeyBtn = buttons.find((b) => b.textContent?.includes("new_api_key"));
    fireEvent.click(newKeyBtn!);
    expect(onCreate).toHaveBeenCalled();
  });

  it("renders loading skeleton when isLoading is true", () => {
    const { container } = render(<ApiKeyListCard keys={[]} isLoading={true} onCreate={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("does not render badge count when isLoading is true", () => {
    render(<ApiKeyListCard keys={[]} isLoading={true} onCreate={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    // Badge should not be rendered during loading
    const badge = screen.queryByText("0");
    expect(badge).not.toBeInTheDocument();
  });

  it("renders badge count when not loading", () => {
    render(<ApiKeyListCard keys={[mockKey as any]} isLoading={false} onCreate={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders api_key_never_used when last_used_at is null", () => {
    render(<ApiKeyListCard keys={[mockKey as any]} isLoading={false} onCreate={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText(/api_key_never_used/)).toBeInTheDocument();
  });

  it("renders formatted last used date when last_used_at is provided", () => {
    render(<ApiKeyListCard keys={[mockKeyWithLastUsed as any]} isLoading={false} onCreate={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.queryByText(/api_key_never_used/)).not.toBeInTheDocument();
  });

  it("calls onEdit when edit button is clicked", () => {
    const onEdit = vi.fn();
    render(<ApiKeyListCard keys={[mockKey as any]} isLoading={false} onCreate={vi.fn()} onEdit={onEdit} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("edit"));
    expect(onEdit).toHaveBeenCalledWith(mockKey);
  });

  it("calls onDelete when delete button is clicked", () => {
    const onDelete = vi.fn();
    render(<ApiKeyListCard keys={[mockKey as any]} isLoading={false} onCreate={vi.fn()} onEdit={vi.fn()} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText("api_key_delete"));
    expect(onDelete).toHaveBeenCalledWith("k1");
  });

  it("calls onCreate when create_api_key button in empty state is clicked", () => {
    const onCreate = vi.fn();
    render(<ApiKeyListCard keys={[]} isLoading={false} onCreate={onCreate} onEdit={vi.fn()} onDelete={vi.fn()} />);
    fireEvent.click(screen.getByText("create_api_key"));
    expect(onCreate).toHaveBeenCalled();
  });
});
