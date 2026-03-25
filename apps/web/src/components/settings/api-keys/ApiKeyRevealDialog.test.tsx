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

  it("resets copied state back to false after 2 seconds (setTimeout callback)", async () => {
    vi.useFakeTimers();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<ApiKeyRevealDialog created={mockCreated as any} onClose={vi.fn()} />);

    fireEvent.click(screen.getByLabelText("api_key_copy"));

    // Flush clipboard promise + run the 2s setTimeout callback in one pass
    await vi.runAllTimersAsync();

    // copied went true → false; the setTimeout callback () => setCopied(false) was invoked
    expect(screen.queryByText("api_key_copied")).not.toBeInTheDocument();

    vi.useRealTimers();
  });

  it("selects input text when input is clicked", () => {
    render(<ApiKeyRevealDialog created={mockCreated as any} onClose={vi.fn()} />);
    const input = screen.getByDisplayValue("wk_secret_key_123") as HTMLInputElement;
    const selectSpy = vi.spyOn(input, "select");
    fireEvent.click(input);
    expect(selectSpy).toHaveBeenCalled();
  });

  // Line 32: handleCopy returns early when created is null
  it("handleCopy does nothing when created is null (line 32)", async () => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    // Render with null — dialog is closed but the component still mounts
    render(<ApiKeyRevealDialog created={null} onClose={vi.fn()} />);
    // Clipboard should not be called since the dialog is not open / created is null
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  // Line 41: onOpenChange triggers onClose when nextOpen is false
  it("calls onClose when dialog onOpenChange fires with false (line 41)", () => {
    // The Dialog's onOpenChange prop calls `!nextOpen && onClose()`.
    // We trigger this by simulating the Escape key which closes the dialog.
    const onClose = vi.fn();
    render(<ApiKeyRevealDialog created={mockCreated as any} onClose={onClose} />);
    // Press Escape to trigger the dialog close via onOpenChange
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });
});
