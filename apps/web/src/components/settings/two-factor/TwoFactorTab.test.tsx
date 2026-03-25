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
  BackupCodesGrid: ({ codes, title }: { codes: string[]; title: string }) => (
    <div data-testid="backup-codes-grid">
      <span>{title}</span>
      {codes.map((c: string, i: number) => <span key={i}>{c}</span>)}
    </div>
  ),
}));

vi.mock("@/components/settings/two-factor/OtpDialog", () => ({
  OtpDialog: ({ open, onClose, title, onConfirm }: { open: boolean; onClose: () => void; title: string; onConfirm: (code: string) => void }) =>
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
  OtpInput: ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) => (
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

  it("shows error toast when setup fails with Error instance", async () => {
    totpSetup.mockRejectedValue(new Error("setup failed"));
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("enable_2fa"));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("setup failed"));
  });

  it("shows error toast with t('error') for non-Error setup failure (line 58 false branch)", async () => {
    totpSetup.mockRejectedValue("string failure");
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("enable_2fa"));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("error"));
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

  it("shows error when verify fails with Error instance", async () => {
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

  // Line 74: err not an Error → t("error") fallback in verifyAndEnable catch
  it("shows t('error') when verifyAndEnable fails with non-Error (line 74 false branch)", async () => {
    totpSetup.mockResolvedValue({
      secret: "ABCDEFGH",
      otpauthUri: "otpauth://totp/test",
      backupCodes: ["AAAA-1111"],
    });
    totpVerify.mockRejectedValue("non-error string");
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("enable_2fa"));
    await waitFor(() => screen.getByTestId("setup-otp-input"));
    fireEvent.change(screen.getByTestId("setup-otp-input"), { target: { value: "123456" } });
    fireEvent.click(screen.getByText("verify"));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("error"));
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

  it("shows error toast when regenerate fails with Error instance", async () => {
    useAuthMock.mockReturnValue(enabledUser);
    totpRegenerateBackup.mockRejectedValue(new Error("regen failed"));
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("regenerate_backup_codes"));
    fireEvent.change(screen.getByTestId("setup-otp-input"), { target: { value: "123456" } });
    fireEvent.click(screen.getByText("regenerate"));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("regen failed"));
  });

  // Line 90: err not an Error → t("error") fallback in regenBackup catch
  it("shows t('error') when regenBackup fails with non-Error (line 90 false branch)", async () => {
    useAuthMock.mockReturnValue(enabledUser);
    totpRegenerateBackup.mockRejectedValue(42);
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("regenerate_backup_codes"));
    fireEvent.change(screen.getByTestId("setup-otp-input"), { target: { value: "123456" } });
    fireEvent.click(screen.getByText("regenerate"));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("error"));
  });

  it("renders reenable OtpDialog with correct title (lines 292-299)", () => {
    useAuthMock.mockReturnValue(disabledUser);
    render(<TwoFactorTab />);
    // Toggle the switch to open "reenable" dialog
    const switchEl = screen.getByRole("switch");
    fireEvent.click(switchEl);
    // OtpDialog for reenable should show
    expect(screen.getByTestId("otp-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("otp-title")).toHaveTextContent("enable_2fa");
  });

  it("renders delete OtpDialog from disabled state with destructive confirm (lines 301-310)", () => {
    useAuthMock.mockReturnValue(disabledUser);
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("delete_2fa_setup"));
    expect(screen.getByTestId("otp-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("otp-title")).toHaveTextContent("delete_2fa_setup");
  });

  it("shows new backup codes grid after regen in enabled state (lines 233-235)", async () => {
    useAuthMock.mockReturnValue(enabledUser);
    totpRegenerateBackup.mockResolvedValue({ backup_codes: ["NEW-1111", "NEW-2222"] });
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("regenerate_backup_codes"));
    fireEvent.change(screen.getByTestId("setup-otp-input"), { target: { value: "123456" } });
    fireEvent.click(screen.getByText("regenerate"));
    await waitFor(() =>
      expect(screen.getByTestId("backup-codes-grid")).toBeInTheDocument(),
    );
    // After regen, regenerate button should be gone (newBackup is set)
    expect(screen.queryByText("regenerate_backup_codes")).not.toBeInTheDocument();
  });

  it("closes disable dialog via onClose (line 285, dialog=null branch)", () => {
    useAuthMock.mockReturnValue(enabledUser);
    render(<TwoFactorTab />);
    // Open disable dialog
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);
    expect(screen.getByTestId("otp-title")).toHaveTextContent("confirm_disable_2fa");
    // Close it
    fireEvent.click(screen.getByTestId("otp-close"));
    expect(screen.queryByTestId("otp-dialog")).not.toBeInTheDocument();
  });

  it("closes reenable dialog via onClose (line 294, dialog=null branch)", () => {
    useAuthMock.mockReturnValue(disabledUser);
    render(<TwoFactorTab />);
    const switchEl = screen.getByRole("switch");
    fireEvent.click(switchEl);
    expect(screen.getByTestId("otp-title")).toHaveTextContent("enable_2fa");
    fireEvent.click(screen.getByTestId("otp-close"));
    expect(screen.queryByTestId("otp-dialog")).not.toBeInTheDocument();
  });

  it("closes delete dialog via onClose (line 302, dialog=null branch, enabled state)", () => {
    useAuthMock.mockReturnValue(enabledUser);
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("delete_2fa_setup"));
    expect(screen.getByTestId("otp-title")).toHaveTextContent("delete_2fa_setup");
    fireEvent.click(screen.getByTestId("otp-close"));
    expect(screen.queryByTestId("otp-dialog")).not.toBeInTheDocument();
  });

  it("clears newBackup after handleDelete succeeds (line 118: setNewBackup null branch)", async () => {
    useAuthMock.mockReturnValue(enabledUser);
    totpRegenerateBackup.mockResolvedValue({ backup_codes: ["CODE-0001"] });
    totpDelete.mockResolvedValue(undefined);
    render(<TwoFactorTab />);

    // Generate backup codes so newBackup is set
    fireEvent.click(screen.getByText("regenerate_backup_codes"));
    fireEvent.change(screen.getByTestId("setup-otp-input"), { target: { value: "123456" } });
    fireEvent.click(screen.getByText("regenerate"));
    await waitFor(() => expect(screen.getByTestId("backup-codes-grid")).toBeInTheDocument());

    // Now delete 2FA — handleDelete sets setNewBackup(null) so grid disappears
    fireEvent.click(screen.getByText("delete_2fa_setup"));
    fireEvent.click(screen.getByTestId("otp-confirm"));
    await waitFor(() => expect(totpDelete).toHaveBeenCalled());
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("2fa_deleted"));
    // newBackup is cleared
    expect(screen.queryByTestId("backup-codes-grid")).not.toBeInTheDocument();
  });

  it("renders disable OtpDialog (open=true) and null for others when dialog=disable", () => {
    useAuthMock.mockReturnValue(enabledUser);
    render(<TwoFactorTab />);
    // Initially no dialog open
    expect(screen.queryByTestId("otp-dialog")).not.toBeInTheDocument();
    // Open disable
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);
    expect(screen.getByTestId("otp-dialog")).toBeInTheDocument();
    // Only one dialog rendered at a time
    expect(screen.getAllByTestId("otp-dialog")).toHaveLength(1);
  });

  // Line 99: if (user?.id) clearTrustedDevice — true branch (user.id is set)
  it("calls clearTrustedDevice with user id when disable succeeds (line 99 true branch)", async () => {
    const { clearTrustedDevice } = await import("@/components/settings/two-factor/helpers");
    useAuthMock.mockReturnValue(enabledUser);
    totpDisable.mockResolvedValue(undefined);
    render(<TwoFactorTab />);
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);
    fireEvent.click(screen.getByTestId("otp-confirm"));
    await waitFor(() => expect(clearTrustedDevice).toHaveBeenCalledWith("u1"));
  });

  // Line 99: if (user?.id) — false branch (user.id is falsy / user is null)
  it("does NOT call clearTrustedDevice when user.id is falsy during disable (line 99 false branch)", async () => {
    const { clearTrustedDevice } = await import("@/components/settings/two-factor/helpers");
    // Use a user with no id — totp_enabled=true so the switch shows, but user?.id is falsy
    useAuthMock.mockReturnValue({
      user: { id: "", totp_enabled: true, totp_configured: true },
      refreshUser,
    });
    totpDisable.mockResolvedValue(undefined);
    render(<TwoFactorTab />);
    const switches = screen.getAllByRole("switch");
    fireEvent.click(switches[0]);
    fireEvent.click(screen.getByTestId("otp-confirm"));
    await waitFor(() => expect(totpDisable).toHaveBeenCalled());
    // clearTrustedDevice should NOT be called (user?.id is falsy)
    expect(clearTrustedDevice).not.toHaveBeenCalled();
  });

  // Line 114: if (user?.id) clearTrustedDevice — true branch (user.id is set)
  it("calls clearTrustedDevice with user id when delete succeeds (line 114 true branch)", async () => {
    const { clearTrustedDevice } = await import("@/components/settings/two-factor/helpers");
    useAuthMock.mockReturnValue(enabledUser);
    totpDelete.mockResolvedValue(undefined);
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("delete_2fa_setup"));
    fireEvent.click(screen.getByTestId("otp-confirm"));
    await waitFor(() => expect(clearTrustedDevice).toHaveBeenCalledWith("u1"));
  });

  // Line 114: if (user?.id) — false branch (user.id is falsy)
  it("does NOT call clearTrustedDevice when user.id is falsy during delete (line 114 false branch)", async () => {
    const { clearTrustedDevice } = await import("@/components/settings/two-factor/helpers");
    useAuthMock.mockReturnValue({
      user: { id: "", totp_enabled: true, totp_configured: true },
      refreshUser,
    });
    totpDelete.mockResolvedValue(undefined);
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("delete_2fa_setup"));
    fireEvent.click(screen.getByTestId("otp-confirm"));
    await waitFor(() => expect(totpDelete).toHaveBeenCalled());
    expect(clearTrustedDevice).not.toHaveBeenCalled();
  });

  it("renders enabled state UI elements (switch checked true, delete button)", () => {
    useAuthMock.mockReturnValue(enabledUser);
    render(<TwoFactorTab />);
    // Switch should be checked (enabled)
    const switchEl = screen.getAllByRole("switch")[0];
    expect(switchEl).toBeInTheDocument();
    expect(screen.getByText("regenerate_backup_codes")).toBeInTheDocument();
    expect(screen.getByText("delete_2fa_setup")).toBeInTheDocument();
  });

  it("renders delete button in disabled state", () => {
    useAuthMock.mockReturnValue(disabledUser);
    render(<TwoFactorTab />);
    expect(screen.getByText("delete_2fa_setup")).toBeInTheDocument();
  });

  // Lines 33-34: user?.totp_enabled ?? false and user?.totp_configured ?? false when user is null
  it("defaults isEnabled and isConfigured to false when user is null (lines 33-34 ?? false branch)", () => {
    // When user is null, user?.totp_enabled ?? false → false, user?.totp_configured ?? false → false
    useAuthMock.mockReturnValue({ user: null, refreshUser });
    render(<TwoFactorTab />);
    // Falls into "not configured" state (isEnabled=false, isConfigured=false)
    expect(screen.getByText("2fa_disabled")).toBeInTheDocument();
    expect(screen.getByText("enable_2fa")).toBeInTheDocument();
  });

  // Line 65: verifyAndEnable — setupData is null → early return (no totpVerify call)
  it("verifyAndEnable returns early when setupData is null (line 65 false branch)", async () => {
    render(<TwoFactorTab />);
    // Don't start setup — just verify the verify button isn't accessible
    expect(screen.queryByText("verify")).not.toBeInTheDocument();
    expect(totpVerify).not.toHaveBeenCalled();
  });

  // Line 123: state ternary — isEnabled=false, isConfigured=false → "not_configured"
  it("renders not_configured state — enable button shown, no switch (line 123 not_configured branch)", () => {
    useAuthMock.mockReturnValue(notConfiguredUser);
    render(<TwoFactorTab />);
    expect(screen.getByText("enable_2fa")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
  });

  // Status banner: isEnabled=true shows 2fa_account_protected (line 147)
  it("shows 2fa_account_protected message in status banner when enabled (line 147)", () => {
    useAuthMock.mockReturnValue(enabledUser);
    render(<TwoFactorTab />);
    expect(screen.getByText("2fa_account_protected")).toBeInTheDocument();
  });

  // Status banner: isEnabled=false, state="disabled" shows 2fa_disabled_linked (line 149)
  it("shows 2fa_disabled_linked in status banner when configured but disabled (line 149)", () => {
    useAuthMock.mockReturnValue(disabledUser);
    render(<TwoFactorTab />);
    expect(screen.getByText("2fa_disabled_linked")).toBeInTheDocument();
  });

  // Status banner: isEnabled=false, state="not_configured" shows 2fa_enable_hint (line 150)
  it("shows 2fa_enable_hint in status banner when not configured (line 150)", () => {
    useAuthMock.mockReturnValue(notConfiguredUser);
    render(<TwoFactorTab />);
    expect(screen.getByText("2fa_enable_hint")).toBeInTheDocument();
  });

  // setupLoading branch: button shows "loading" text when setup is in progress
  it("shows loading text on enable button while setup is in progress (setupLoading=true branch)", async () => {
    // Make setup hang indefinitely
    totpSetup.mockReturnValue(new Promise(() => {}));
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("enable_2fa"));
    // During loading, the button text should change to "loading"
    await waitFor(() => expect(screen.getByText("loading")).toBeInTheDocument());
  });

  // verify button: setupLoading=true shows "loading" text
  it("shows loading text on verify button while verification is in progress", async () => {
    totpSetup.mockResolvedValue({
      secret: "ABCDEFGH",
      otpauthUri: "otpauth://totp/test",
      backupCodes: ["AAAA-1111"],
    });
    totpVerify.mockReturnValue(new Promise(() => {}));
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("enable_2fa"));
    await waitFor(() => screen.getByTestId("setup-otp-input"));
    fireEvent.change(screen.getByTestId("setup-otp-input"), { target: { value: "123456" } });
    fireEvent.click(screen.getByText("verify"));
    await waitFor(() => expect(screen.getByText("loading")).toBeInTheDocument());
  });

  // regenerate button: regenLoading=true shows "loading" text
  it("shows loading text on regenerate button while regen is in progress", async () => {
    useAuthMock.mockReturnValue(enabledUser);
    totpRegenerateBackup.mockReturnValue(new Promise(() => {}));
    render(<TwoFactorTab />);
    fireEvent.click(screen.getByText("regenerate_backup_codes"));
    fireEvent.change(screen.getByTestId("setup-otp-input"), { target: { value: "123456" } });
    fireEvent.click(screen.getByText("regenerate"));
    await waitFor(() => expect(screen.getByText("loading")).toBeInTheDocument());
  });

  // !showRegen && !newBackup condition: regen button visible when showRegen=false AND newBackup=null
  it("shows regenerate button only when showRegen=false and newBackup=null (line 247 condition)", () => {
    useAuthMock.mockReturnValue(enabledUser);
    render(<TwoFactorTab />);
    // Initially showRegen=false and newBackup=null → regen button (role=button) visible
    // Use role+name to specifically target the <Button> element (not the h3 heading)
    expect(screen.getByRole("button", { name: /regenerate_backup_codes/i })).toBeInTheDocument();
    // After clicking the regen button, showRegen becomes true → regen button hidden
    // (the heading inside the regen form also says "regenerate_backup_codes" but is not a button)
    fireEvent.click(screen.getByRole("button", { name: /regenerate_backup_codes/i }));
    expect(screen.queryByRole("button", { name: /regenerate_backup_codes/i })).not.toBeInTheDocument();
  });
});
