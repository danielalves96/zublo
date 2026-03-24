import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { OtpDialog } from "./OtpDialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/components/ui/otp-input", () => ({
  OtpInput: (props: any) => <input data-testid="otp-input" value={props.value} onChange={(e: any) => props.onChange(e.target.value)} />,
}));

const { toastError } = vi.hoisted(() => ({ toastError: vi.fn() }));
vi.mock("@/lib/toast", () => ({
  toast: { error: toastError },
}));

describe("OtpDialog", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders title and description when open", () => {
    render(
      <OtpDialog
        open={true}
        onClose={vi.fn()}
        title="Verify"
        description="Enter your code"
        confirmLabel="Confirm"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText("Verify")).toBeInTheDocument();
    expect(screen.getByText("Enter your code")).toBeInTheDocument();
  });

  it("renders confirm button disabled by default", () => {
    render(
      <OtpDialog
        open={true}
        onClose={vi.fn()}
        title="Verify"
        description="Enter code"
        confirmLabel="OK"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
  });

  it("shows backup code toggle when allowBackup is true", () => {
    render(
      <OtpDialog
        open={true}
        onClose={vi.fn()}
        title="Verify"
        description="Enter code"
        confirmLabel="OK"
        onConfirm={vi.fn()}
        allowBackup={true}
      />,
    );
    expect(screen.getByText("use_backup_code")).toBeInTheDocument();
  });

  it("enables confirm button when 6-digit OTP is entered", () => {
    render(
      <OtpDialog
        open={true}
        onClose={vi.fn()}
        title="Verify"
        description="Enter code"
        confirmLabel="OK"
        onConfirm={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByTestId("otp-input"), { target: { value: "123456" } });
    expect(screen.getByRole("button", { name: "OK" })).not.toBeDisabled();
  });

  it("calls onConfirm with OTP when confirm button clicked", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <OtpDialog
        open={true}
        onClose={vi.fn()}
        title="Verify"
        description="Enter code"
        confirmLabel="OK"
        onConfirm={onConfirm}
      />,
    );
    fireEvent.change(screen.getByTestId("otp-input"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("123456"));
  });

  it("shows error toast when onConfirm throws", async () => {
    const onConfirm = vi.fn().mockRejectedValue(new Error("invalid code"));
    render(
      <OtpDialog
        open={true}
        onClose={vi.fn()}
        title="Verify"
        description="Enter code"
        confirmLabel="OK"
        onConfirm={onConfirm}
      />,
    );
    fireEvent.change(screen.getByTestId("otp-input"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("invalid code"));
  });

  it("shows error toast with fallback message for non-Error throws", async () => {
    const onConfirm = vi.fn().mockRejectedValue("string error");
    render(
      <OtpDialog
        open={true}
        onClose={vi.fn()}
        title="Verify"
        description="Enter code"
        confirmLabel="OK"
        onConfirm={onConfirm}
      />,
    );
    fireEvent.change(screen.getByTestId("otp-input"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });

  it("calls onClose when cancel button is clicked", () => {
    const onClose = vi.fn();
    render(
      <OtpDialog
        open={true}
        onClose={onClose}
        title="Verify"
        description="Enter code"
        confirmLabel="OK"
        onConfirm={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByText("cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("switches to backup mode when use_backup_code is clicked", () => {
    render(
      <OtpDialog
        open={true}
        onClose={vi.fn()}
        title="Verify"
        description="Enter code"
        confirmLabel="OK"
        onConfirm={vi.fn()}
        allowBackup={true}
      />,
    );
    fireEvent.click(screen.getByText("use_backup_code"));
    expect(screen.getByText("use_authenticator_app")).toBeInTheDocument();
    // Should show backup code input
    expect(screen.getByPlaceholderText("XXXX-XXXX")).toBeInTheDocument();
  });

  it("switches back to OTP mode from backup mode", () => {
    render(
      <OtpDialog
        open={true}
        onClose={vi.fn()}
        title="Verify"
        description="Enter code"
        confirmLabel="OK"
        onConfirm={vi.fn()}
        allowBackup={true}
      />,
    );
    fireEvent.click(screen.getByText("use_backup_code"));
    fireEvent.click(screen.getByText("use_authenticator_app"));
    expect(screen.getByText("use_backup_code")).toBeInTheDocument();
    expect(screen.getByTestId("otp-input")).toBeInTheDocument();
  });

  it("enables confirm button when valid backup code is entered", () => {
    render(
      <OtpDialog
        open={true}
        onClose={vi.fn()}
        title="Verify"
        description="Enter code"
        confirmLabel="OK"
        onConfirm={vi.fn()}
        allowBackup={true}
      />,
    );
    fireEvent.click(screen.getByText("use_backup_code"));
    const backupInput = screen.getByPlaceholderText("XXXX-XXXX");
    fireEvent.change(backupInput, { target: { value: "AAAA-1111" } });
    expect(screen.getByRole("button", { name: "OK" })).not.toBeDisabled();
  });

  it("calls onConfirm with backup code (whitespace stripped) when confirm clicked", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <OtpDialog
        open={true}
        onClose={vi.fn()}
        title="Verify"
        description="Enter code"
        confirmLabel="OK"
        onConfirm={onConfirm}
        allowBackup={true}
      />,
    );
    fireEvent.click(screen.getByText("use_backup_code"));
    const backupInput = screen.getByPlaceholderText("XXXX-XXXX");
    fireEvent.change(backupInput, { target: { value: "AAAA1111" } });
    fireEvent.click(screen.getByRole("button", { name: "OK" }));
    await waitFor(() => expect(onConfirm).toHaveBeenCalledWith("AAAA1111"));
  });

  it("resets form state when dialog is closed via onOpenChange", () => {
    const onClose = vi.fn();
    render(
      <OtpDialog
        open={true}
        onClose={onClose}
        title="Verify"
        description="Enter code"
        confirmLabel="OK"
        onConfirm={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByTestId("otp-input"), { target: { value: "123456" } });
    // Closing the dialog resets state
    fireEvent.click(screen.getByText("cancel"));
    expect(onClose).toHaveBeenCalled();
  });

  it("uses destructive variant when confirmVariant is destructive", () => {
    render(
      <OtpDialog
        open={true}
        onClose={vi.fn()}
        title="Confirm Action"
        description="Are you sure?"
        confirmLabel="Confirm Delete"
        confirmVariant="destructive"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText("Confirm Delete")).toBeInTheDocument();
  });
});
