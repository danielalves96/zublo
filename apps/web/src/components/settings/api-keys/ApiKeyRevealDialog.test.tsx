import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ApiKeyRevealDialog } from "./ApiKeyRevealDialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/components/settings/api-keys/PermissionBadge", () => ({
  PermissionBadge: ({ perm }: any) => <span data-testid={`perm-${perm}`}>{perm}</span>,
}));

const mockCreated = {
  key: "wk_secret_key_123",
  permissions: ["subscriptions:read" as const, "subscriptions:write" as const],
};

describe("ApiKeyRevealDialog", () => {
  it("renders key and warning when created is provided", () => {
    render(<ApiKeyRevealDialog created={mockCreated as any} onClose={vi.fn()} />);
    expect(screen.getByText("api_key_created_title")).toBeInTheDocument();
    expect(screen.getByText("api_key_created_warning")).toBeInTheDocument();
    expect(screen.getByDisplayValue("wk_secret_key_123")).toBeInTheDocument();
  });

  it("does not render when created is null", () => {
    const { container } = render(<ApiKeyRevealDialog created={null} onClose={vi.fn()} />);
    expect(container.querySelector("[role='dialog']")).not.toBeInTheDocument();
  });

  it("renders permissions when created has permissions", () => {
    render(<ApiKeyRevealDialog created={mockCreated as any} onClose={vi.fn()} />);
    expect(screen.getByTestId("perm-subscriptions:read")).toBeInTheDocument();
    expect(screen.getByTestId("perm-subscriptions:write")).toBeInTheDocument();
  });

  it("does not render permissions section when permissions array is empty", () => {
    const noPermCreated = { key: "wk_test", permissions: [] };
    render(<ApiKeyRevealDialog created={noPermCreated as any} onClose={vi.fn()} />);
    expect(screen.queryByText("api_key_permissions")).not.toBeInTheDocument();
  });

  it("calls onClose when done button is clicked", () => {
    const onClose = vi.fn();
    render(<ApiKeyRevealDialog created={mockCreated as any} onClose={onClose} />);
    fireEvent.click(screen.getByText("api_key_done"));
    expect(onClose).toHaveBeenCalled();
  });

  it("copies key to clipboard and shows copied state when copy button is clicked", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<ApiKeyRevealDialog created={mockCreated as any} onClose={vi.fn()} />);
    fireEvent.click(screen.getByLabelText("api_key_copy"));
    await waitFor(() => {
      expect(screen.getByText("api_key_copied")).toBeInTheDocument();
    });
  });

  it("selects input text when input is clicked", () => {
    render(<ApiKeyRevealDialog created={mockCreated as any} onClose={vi.fn()} />);
    const input = screen.getByDisplayValue("wk_secret_key_123") as HTMLInputElement;
    const selectSpy = vi.spyOn(input, "select");
    fireEvent.click(input);
    expect(selectSpy).toHaveBeenCalled();
  });
});
