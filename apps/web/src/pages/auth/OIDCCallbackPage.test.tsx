import { render, screen, waitFor } from "@testing-library/react";

import { SS_KEYS } from "@/lib/constants";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  refreshUser: vi.fn(),
  toastError: vi.fn(),
  saveSession: vi.fn(),
  completeAuthorization: vi.fn(),
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

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    refreshUser: mocks.refreshUser,
  }),
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    error: mocks.toastError,
  },
}));

vi.mock("@/services/auth", () => ({
  authService: {
    saveSession: mocks.saveSession,
  },
}));

vi.mock("@/services/oidc", () => ({
  oidcService: {
    completeAuthorization: mocks.completeAuthorization,
  },
}));

import { OIDCCallbackPage } from "./OIDCCallbackPage";

function setSearch(search: string) {
  window.history.pushState({}, "", `/oidc/callback${search}`);
}

describe("OIDCCallbackPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.refreshUser.mockResolvedValue(undefined);
  });

  it("completes the login and redirects to the dashboard", async () => {
    sessionStorage.setItem(SS_KEYS.OIDC_LOGIN_STATE, "state-1");
    setSearch("?code=code-1&state=state-1");
    mocks.completeAuthorization.mockResolvedValue({
      token: "token-1",
      record: { id: "user-1" },
    });

    render(<OIDCCallbackPage />);

    expect(screen.getByText("oidc_signing_in")).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.saveSession).toHaveBeenCalledWith("token-1", { id: "user-1" });
    });
    expect(mocks.completeAuthorization).toHaveBeenCalledWith("code-1", "state-1");
    expect(mocks.refreshUser).toHaveBeenCalled();
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/dashboard", replace: true });
    expect(sessionStorage.getItem(SS_KEYS.OIDC_LOGIN_STATE)).toBeNull();
  });

  it("reports the error returned by the provider", async () => {
    sessionStorage.setItem(SS_KEYS.OIDC_LOGIN_STATE, "state-1");
    setSearch("?error=access_denied");

    render(<OIDCCallbackPage />);

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("access_denied");
    });
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login", replace: true });
    expect(mocks.completeAuthorization).not.toHaveBeenCalled();
  });

  it("rejects a callback without a code", async () => {
    sessionStorage.setItem(SS_KEYS.OIDC_LOGIN_STATE, "state-1");
    setSearch("?state=state-1");

    render(<OIDCCallbackPage />);

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("oidc_login_failed");
    });
    expect(mocks.completeAuthorization).not.toHaveBeenCalled();
  });

  it("rejects a state that does not match the one issued before the redirect", async () => {
    sessionStorage.setItem(SS_KEYS.OIDC_LOGIN_STATE, "state-1");
    setSearch("?code=code-1&state=tampered");

    render(<OIDCCallbackPage />);

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("oidc_login_failed");
    });
    expect(mocks.completeAuthorization).not.toHaveBeenCalled();
  });

  it("shows the backend error message when the code exchange fails", async () => {
    sessionStorage.setItem(SS_KEYS.OIDC_LOGIN_STATE, "state-1");
    setSearch("?code=code-1&state=state-1");
    mocks.completeAuthorization.mockRejectedValue(new Error("Invalid or expired OIDC state"));

    render(<OIDCCallbackPage />);

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("Invalid or expired OIDC state");
    });
    expect(mocks.navigate).toHaveBeenCalledWith({ to: "/login", replace: true });
  });

  it("shows unknown_error when a non-Error is thrown during the exchange", async () => {
    sessionStorage.setItem(SS_KEYS.OIDC_LOGIN_STATE, "state-1");
    setSearch("?code=code-1&state=state-1");
    mocks.completeAuthorization.mockRejectedValue("boom");

    render(<OIDCCallbackPage />);

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("unknown_error");
    });
  });

  it("runs the exchange only once when the effect is re-invoked", async () => {
    sessionStorage.setItem(SS_KEYS.OIDC_LOGIN_STATE, "state-1");
    setSearch("?code=code-1&state=state-1");
    mocks.completeAuthorization.mockResolvedValue({
      token: "token-1",
      record: { id: "user-1" },
    });

    const { rerender } = render(<OIDCCallbackPage />);
    rerender(<OIDCCallbackPage />);

    await waitFor(() => {
      expect(mocks.completeAuthorization).toHaveBeenCalledTimes(1);
    });
  });
});
