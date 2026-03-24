import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { TwoFactorTab } from "./TwoFactorTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const {
  refreshUser,
  useAuthMock,
  toastSuccess,
  toastError,
  totpSetup,
  totpVerify,
  totpDisable,
  totpReenable,
  totpDelete,
  totpRegenerateBackup,
} = vi.hoisted(() => ({
  refreshUser: vi.fn(),
  useAuthMock: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  totpSetup: vi.fn(),
  totpVerify: vi.fn(),
  totpDisable: vi.fn(),
  totpReenable: vi.fn(),
  totpDelete: vi.fn(),
  totpRegenerateBackup: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: useAuthMock,
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: { totp_enabled: false } }),
  useMutation: () => ({ mutate: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/services/users", () => ({
  usersService: { enable2FA: vi.fn(), disable2FA: vi.fn() },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { auth: { me: () => ["auth", "me"] } },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: () => <svg data-testid="qr-code" />,
}));

vi.mock("@/components/settings/two-factor/BackupCodesGrid", () => ({
  BackupCodesGrid: ({ codes, title }: any) => (
    <div data-testid="backup-codes-grid">
      <span>{title}</span>
      {codes.map((c: string, i: number) => <span key={i}>{c}</span>)}
    </div>
  ),
}));

vi.mock("@/components/settings/two-factor/OtpDialog", () => ({
  OtpDialog: ({ open, onClose, title, onConfirm }: any) =>
    open ? (
      <div data-testid="otp-dialog">
        <span data-testid="otp-title">{title}</span>
        <button data-testid="otp-confirm" onClick={() => onConfirm("123456")}>confirm</button>
        <button data-testid="otp-close" onClick={onClose}>close</button>
      </div>
    ) : null,
}));

vi.mock("@/components/settings/two-factor/helpers", () => ({
  clearTrustedDevice: vi.fn(),
}));

vi.mock("@/components/ui/otp-input", () => ({
  OtpInput: ({ value, onChange, disabled }: any) => (
    <input
      data-testid="setup-otp-input"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    />
  ),
}));

vi.mock("@/services/totp", () => ({
  totpService: {
    setup: totpSetup,
    verify: totpVerify,
    disable: totpDisable,
    reenable: totpReenable,
    delete: totpDelete,
    regenerateBackup: totpRegenerateBackup,
  },
}));

const notConfiguredUser = { user: { id: "u1", totp_enabled: false, totp_configured: false }, refreshUser };
const enabledUser = { user: { id: "u1", totp_enabled: true, totp_configured: true }, refreshUser };
const disabledUser = { user: { id: "u1", totp_enabled: false, totp_configured: true }, refreshUser };

describe("TwoFactorTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshUser.mockResolvedValue(undefined);
    useAuthMock.mockReturnValue(notConfiguredUser);
  });

  it("renders heading", () => {
    render(<TwoFactorTab />);
    expect(screen.getByText("two_factor_auth")).toBeInTheDocument();
  });

  it("renders 2fa_disabled status when not configured", () => {
    render(<TwoFactorTab />);
    expect(screen.getByText("2fa_disabled")).toBeInTheDocument();
  });

  it("renders enable_2fa button in not_configured state", () => {
    render(<TwoFactorTab />);
    expect(screen.getByText("enable_2fa")).toBeInTheDocument();
  });

  it("starts setup flow when enable_2fa button clicked", async () => {
    totpSetup.mockResolvedValue({
      secret: "ABCDEFGH",
      otpauthUri: "otpauth://totp/test",
      backupCodes: ["AAAA-1111", "BBBB-2222"],
    });
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("enable_2fa"));
    await waitFor(() => expect(screen.getByTestId("qr-code")).toBeInTheDocument());
    expect(screen.getByText("ABCDEFGH")).toBeInTheDocument();
  });

  it("shows error toast when setup fails", async () => {
    totpSetup.mockRejectedValue(new Error("setup failed"));
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("enable_2fa"));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("setup failed"));
  });

  it("shows error toast with fallback for non-Error setup failure", async () => {
    totpSetup.mockRejectedValue("string failure");
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("enable_2fa"));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });

  it("cancels setup flow when cancel button clicked", async () => {
    totpSetup.mockResolvedValue({
      secret: "ABCDEFGH",
      otpauthUri: "otpauth://totp/test",
      backupCodes: ["AAAA-1111"],
    });
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("enable_2fa"));
    await waitFor(() => screen.getByTestId("qr-code"));
    fireEvent.click(screen.getByText("cancel"));
    expect(screen.queryByTestId("qr-code")).not.toBeInTheDocument();
  });

  it("verifies and enables 2FA successfully", async () => {
    totpSetup.mockResolvedValue({
      secret: "ABCDEFGH",
      otpauthUri: "otpauth://totp/test",
      backupCodes: ["AAAA-1111"],
    });
    totpVerify.mockResolvedValue(undefined);
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("enable_2fa"));
    await waitFor(() => screen.getByTestId("setup-otp-input"));
    fireEvent.change(screen.getByTestId("setup-otp-input"), { target: { value: "123456" } });
    fireEvent.click(screen.getByText("verify"));
    await waitFor(() => expect(totpVerify).toHaveBeenCalled());
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("2fa_enabled"));
  });

  it("shows error when verify fails", async () => {
    totpSetup.mockResolvedValue({
      secret: "ABCDEFGH",
      otpauthUri: "otpauth://totp/test",
      backupCodes: ["AAAA-1111"],
    });
    totpVerify.mockRejectedValue(new Error("invalid code"));
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("enable_2fa"));
    await waitFor(() => screen.getByTestId("setup-otp-input"));
    fireEvent.change(screen.getByTestId("setup-otp-input"), { target: { value: "123456" } });
    fireEvent.click(screen.getByText("verify"));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("invalid code"));
  });

  it("copies secret to clipboard when copy button clicked in setup flow", async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
    totpSetup.mockResolvedValue({
      secret: "ABCDEFGH",
      otpauthUri: "otpauth://totp/test",
      backupCodes: ["AAAA-1111"],
    });
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("enable_2fa"));
    await waitFor(() => screen.getByTestId("qr-code"));
    // Find the copy button near the secret code display
    const buttons = screen.getAllByRole("button");
    const copyBtn = buttons.find((b) => b.querySelector("svg"));
    if (copyBtn) {
      fireEvent.click(copyBtn);
      await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith("ABCDEFGH"));
    }
  });

  it("renders enabled state with disable switch", () => {
    useAuthMock.mockReturnValue(enabledUser);
    render(<TwoFactorTab />);
    expect(screen.getByText("2fa_enabled")).toBeInTheDocument();
    expect(screen.getByText("2fa_account_protected")).toBeInTheDocument();
  });

  it("opens disable dialog when switch is toggled in enabled state", () => {
    useAuthMock.mockReturnValue(enabledUser);
    render(<TwoFactorTab />);
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);
    expect(screen.getByTestId("otp-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("otp-title")).toHaveTextContent("confirm_disable_2fa");
  });

  it("handles disable 2FA successfully", async () => {
    useAuthMock.mockReturnValue(enabledUser);
    totpDisable.mockResolvedValue(undefined);
    render(<TwoFactorTab />);
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);
    fireEvent.click(screen.getByTestId("otp-confirm"));
    await waitFor(() => expect(totpDisable).toHaveBeenCalledWith("123456"));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("2fa_disabled"));
  });

  it("opens delete dialog when delete button clicked in enabled state", () => {
    useAuthMock.mockReturnValue(enabledUser);
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("delete_2fa_setup"));
    expect(screen.getByTestId("otp-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("otp-title")).toHaveTextContent("delete_2fa_setup");
  });

  it("handles delete 2FA successfully", async () => {
    useAuthMock.mockReturnValue(enabledUser);
    totpDelete.mockResolvedValue(undefined);
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("delete_2fa_setup"));
    fireEvent.click(screen.getByTestId("otp-confirm"));
    await waitFor(() => expect(totpDelete).toHaveBeenCalled());
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("2fa_deleted"));
  });

  it("renders disabled state with reenable switch", () => {
    useAuthMock.mockReturnValue(disabledUser);
    render(<TwoFactorTab />);
    expect(screen.getByText("2fa_disabled_linked")).toBeInTheDocument();
  });

  it("opens reenable dialog when switch clicked in disabled state", () => {
    useAuthMock.mockReturnValue(disabledUser);
    render(<TwoFactorTab />);
    const switchEl = screen.getByRole("switch");
    fireEvent.click(switchEl);
    expect(screen.getByTestId("otp-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("otp-title")).toHaveTextContent("enable_2fa");
  });

  it("handles reenable 2FA successfully", async () => {
    useAuthMock.mockReturnValue(disabledUser);
    totpReenable.mockResolvedValue(undefined);
    render(<TwoFactorTab />);
    const switchEl = screen.getByRole("switch");
    fireEvent.click(switchEl);
    fireEvent.click(screen.getByTestId("otp-confirm"));
    await waitFor(() => expect(totpReenable).toHaveBeenCalledWith("123456"));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("2fa_enabled"));
  });

  it("opens delete dialog when delete button clicked in disabled state", () => {
    useAuthMock.mockReturnValue(disabledUser);
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("delete_2fa_setup"));
    expect(screen.getByTestId("otp-dialog")).toBeInTheDocument();
  });

  it("closes dialog when onClose is called", () => {
    useAuthMock.mockReturnValue(enabledUser);
    render(<TwoFactorTab />);
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);
    expect(screen.getByTestId("otp-dialog")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("otp-close"));
    expect(screen.queryByTestId("otp-dialog")).not.toBeInTheDocument();
  });

  it("shows regenerate backup codes button in enabled state", () => {
    useAuthMock.mockReturnValue(enabledUser);
    render(<TwoFactorTab />);
    expect(screen.getByText("regenerate_backup_codes")).toBeInTheDocument();
  });

  it("shows regenerate form when regenerate button clicked", () => {
    useAuthMock.mockReturnValue(enabledUser);
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("regenerate_backup_codes"));
    expect(screen.getByText("enter_code_to_regen")).toBeInTheDocument();
  });

  it("cancels regenerate flow when cancel clicked", () => {
    useAuthMock.mockReturnValue(enabledUser);
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("regenerate_backup_codes"));
    fireEvent.click(screen.getByText("cancel"));
    expect(screen.queryByText("enter_code_to_regen")).not.toBeInTheDocument();
  });

  it("regenerates backup codes successfully", async () => {
    useAuthMock.mockReturnValue(enabledUser);
    totpRegenerateBackup.mockResolvedValue({ backup_codes: ["CODE-1111", "CODE-2222"] });
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("regenerate_backup_codes"));
    fireEvent.change(screen.getByTestId("setup-otp-input"), { target: { value: "123456" } });
    fireEvent.click(screen.getByText("regenerate"));
    await waitFor(() => expect(totpRegenerateBackup).toHaveBeenCalledWith("123456"));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("backup_codes_regenerated"));
    expect(screen.getByTestId("backup-codes-grid")).toBeInTheDocument();
  });

  it("shows error toast when regenerate fails", async () => {
    useAuthMock.mockReturnValue(enabledUser);
    totpRegenerateBackup.mockRejectedValue(new Error("regen failed"));
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("regenerate_backup_codes"));
    fireEvent.change(screen.getByTestId("setup-otp-input"), { target: { value: "123456" } });
    fireEvent.click(screen.getByText("regenerate"));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("regen failed"));
  });
});
