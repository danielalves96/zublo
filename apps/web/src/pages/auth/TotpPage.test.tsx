import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { LS_KEYS, SS_KEYS } from "@/lib/constants";

// Helper to create an in-memory Storage implementation
function makeStorage(): Storage {
  const store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => { store[key] = value; },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
    get length() { return Object.keys(store).length; },
    key: (index: number) => Object.keys(store)[index] ?? null,
  };
}

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  refreshUser: vi.fn(),
  completeTotpLoginChallenge: vi.fn(),
  saveSession: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/components/AppLogo", () => ({
  LogoWithName: () => <div>logo</div>,
}));

vi.mock("@/components/ui/otp-input", () => ({
  OtpInput: ({
    value,
    onChange,
    disabled,
  }: {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
  }) => (
    <input
      aria-label="otp"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
    />
  ),
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    id,
    checked,
    onCheckedChange,
  }: {
    id: string;
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <input
      id={id}
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
  ),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    refreshUser: mocks.refreshUser,
  }),
}));

vi.mock("@/services/auth", () => ({
  authService: {
    completeTotpLoginChallenge: mocks.completeTotpLoginChallenge,
    saveSession: mocks.saveSession,
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    error: mocks.toastError,
  },
}));

import { TotpPage } from "./TotpPage";

describe("TotpPage", () => {
  let ls: Storage;
  let ss: Storage;

  beforeEach(() => {
    vi.clearAllMocks();
    ls = makeStorage();
    ss = makeStorage();
    vi.stubGlobal("localStorage", ls);
    vi.stubGlobal("sessionStorage", ss);
    mocks.refreshUser.mockResolvedValue(undefined);
    mocks.completeTotpLoginChallenge.mockResolvedValue({
      token: "token-123",
      record: { id: "user-1" },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redirects back to login when there is no valid challenge in session storage", async () => {
    render(<TotpPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: "/login",
        replace: true,
      });
    });
  });

  it("verifies the authenticator OTP, persists trusted-device state, and redirects", async () => {
    sessionStorage.setItem(
      SS_KEYS.TOTP_LOGIN_CHALLENGE,
      JSON.stringify({
        challenge: "challenge-123",
        expiresAt: "2099-01-01T00:00:00.000Z",
        userId: "user-1",
      }),
    );

    render(<TotpPage />);

    fireEvent.change(screen.getByLabelText("otp"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByLabelText("remember_device_30_days"));
    fireEvent.click(screen.getByRole("button", { name: "verify" }));

    await waitFor(() => {
      expect(mocks.completeTotpLoginChallenge).toHaveBeenCalledWith(
        "challenge-123",
        "123456",
      );
    });

    expect(mocks.saveSession).toHaveBeenCalledWith("token-123", {
      id: "user-1",
    });
    expect(localStorage.getItem(LS_KEYS.totpTrusted("user-1"))).not.toBeNull();
    expect(sessionStorage.getItem(SS_KEYS.TOTP_LOGIN_CHALLENGE)).toBeNull();
    expect(mocks.refreshUser).toHaveBeenCalledTimes(1);
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/dashboard",
      replace: true,
    });
  });

  it("switches to backup codes and verifies with a stripped backup code", async () => {
    sessionStorage.setItem(
      SS_KEYS.TOTP_LOGIN_CHALLENGE,
      JSON.stringify({
        challenge: "challenge-123",
        expiresAt: "2099-01-01T00:00:00.000Z",
        userId: "user-1",
      }),
    );

    render(<TotpPage />);

    fireEvent.click(screen.getByRole("button", { name: "use_backup_code" }));
    fireEvent.change(screen.getByLabelText("backup_codes"), {
      target: { value: "ABCD-EFGH" },
    });
    fireEvent.click(screen.getByRole("button", { name: "verify" }));

    await waitFor(() => {
      expect(mocks.completeTotpLoginChallenge).toHaveBeenCalledWith(
        "challenge-123",
        "ABCD-EFGH",
      );
    });
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/dashboard",
      replace: true,
    });
  });

  it("redirects to login when the stored challenge is expired", async () => {
    sessionStorage.setItem(
      SS_KEYS.TOTP_LOGIN_CHALLENGE,
      JSON.stringify({
        challenge: "challenge-123",
        expiresAt: "2000-01-01T00:00:00.000Z", // expired
        userId: "user-1",
      }),
    );

    render(<TotpPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: "/login",
        replace: true,
      });
    });
  });

  it("redirects to login when the stored challenge has invalid JSON", async () => {
    sessionStorage.setItem(SS_KEYS.TOTP_LOGIN_CHALLENGE, "not-valid-json");

    render(<TotpPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: "/login",
        replace: true,
      });
    });
  });

  it("redirects to login when the stored challenge is missing required fields", async () => {
    sessionStorage.setItem(
      SS_KEYS.TOTP_LOGIN_CHALLENGE,
      JSON.stringify({ challenge: "challenge-123" }), // missing expiresAt and userId
    );

    render(<TotpPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: "/login",
        replace: true,
      });
    });
  });

  it("shows invalid_otp and calls onChallengeExpired when OTP error contains 'challenge'", async () => {
    mocks.completeTotpLoginChallenge.mockRejectedValue(
      new Error("challenge has already expired"),
    );

    sessionStorage.setItem(
      SS_KEYS.TOTP_LOGIN_CHALLENGE,
      JSON.stringify({
        challenge: "challenge-123",
        expiresAt: "2099-01-01T00:00:00.000Z",
        userId: "user-1",
      }),
    );

    render(<TotpPage />);

    fireEvent.change(screen.getByLabelText("otp"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "verify" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("challenge has already expired");
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login", replace: true });
    });
  });

  it("shows invalid_otp when a non-Error is thrown during OTP verification", async () => {
    mocks.completeTotpLoginChallenge.mockRejectedValue("string-error");

    sessionStorage.setItem(
      SS_KEYS.TOTP_LOGIN_CHALLENGE,
      JSON.stringify({
        challenge: "challenge-123",
        expiresAt: "2099-01-01T00:00:00.000Z",
        userId: "user-1",
      }),
    );

    render(<TotpPage />);

    fireEvent.change(screen.getByLabelText("otp"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "verify" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("invalid_otp");
    });
  });

  it("navigates to login when back-to-login is clicked", async () => {
    sessionStorage.setItem(
      SS_KEYS.TOTP_LOGIN_CHALLENGE,
      JSON.stringify({
        challenge: "challenge-123",
        expiresAt: "2099-01-01T00:00:00.000Z",
        userId: "user-1",
      }),
    );

    render(<TotpPage />);

    fireEvent.click(screen.getByRole("button", { name: "back_to_login" }));

    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login", replace: true });
  });

  it("shows invalid_otp when a non-Error is thrown during backup code verification", async () => {
    mocks.completeTotpLoginChallenge.mockRejectedValue("string-error");

    sessionStorage.setItem(
      SS_KEYS.TOTP_LOGIN_CHALLENGE,
      JSON.stringify({
        challenge: "challenge-123",
        expiresAt: "2099-01-01T00:00:00.000Z",
        userId: "user-1",
      }),
    );

    render(<TotpPage />);

    fireEvent.click(screen.getByRole("button", { name: "use_backup_code" }));
    fireEvent.change(screen.getByLabelText("backup_codes"), {
      target: { value: "ABCD-EFGH" },
    });
    fireEvent.click(screen.getByRole("button", { name: "verify" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("invalid_otp");
    });
  });

  it("shows error and calls onChallengeExpired when backup code error contains 'challenge'", async () => {
    mocks.completeTotpLoginChallenge.mockRejectedValue(
      new Error("challenge has already expired"),
    );

    sessionStorage.setItem(
      SS_KEYS.TOTP_LOGIN_CHALLENGE,
      JSON.stringify({
        challenge: "challenge-123",
        expiresAt: "2099-01-01T00:00:00.000Z",
        userId: "user-1",
      }),
    );

    render(<TotpPage />);

    fireEvent.click(screen.getByRole("button", { name: "use_backup_code" }));
    fireEvent.change(screen.getByLabelText("backup_codes"), {
      target: { value: "ABCD-EFGH" },
    });
    fireEvent.click(screen.getByRole("button", { name: "verify" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("challenge has already expired");
      expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login", replace: true });
    });
  });

  it("navigates back from backup screen to OTP screen via use_authenticator_app", async () => {
    sessionStorage.setItem(
      SS_KEYS.TOTP_LOGIN_CHALLENGE,
      JSON.stringify({
        challenge: "challenge-123",
        expiresAt: "2099-01-01T00:00:00.000Z",
        userId: "user-1",
      }),
    );

    render(<TotpPage />);

    fireEvent.click(screen.getByRole("button", { name: "use_backup_code" }));
    expect(screen.getByLabelText("backup_codes")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "use_authenticator_app" }));
    expect(screen.getByLabelText("otp")).toBeInTheDocument();
  });
});
