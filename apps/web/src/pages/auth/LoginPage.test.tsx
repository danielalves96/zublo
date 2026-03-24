import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SS_KEYS } from "@/lib/constants";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  login: vi.fn(),
  toastError: vi.fn(),
  isTotpRequiredError: vi.fn(),
  fetchMock: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
  }: {
    to: string;
    children: React.ReactNode;
  }) => <a href={to}>{children}</a>,
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/components/AppLogo", () => ({
  LogoWithName: () => <div>logo</div>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    login: mocks.login,
  }),
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    error: mocks.toastError,
  },
}));

vi.mock("@/services/auth", () => ({
  isTotpRequiredError: mocks.isTotpRequiredError,
}));

import { LoginPage } from "./LoginPage";

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mocks.fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ hasUsers: true }),
    });
    mocks.login.mockResolvedValue(undefined);
    mocks.isTotpRequiredError.mockReturnValue(false);
    vi.stubGlobal("fetch", mocks.fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("logs the user in and redirects to the dashboard", async () => {
    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "daniel@example.com" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith(
        "daniel@example.com",
        "password123",
      );
    });
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/dashboard",
      replace: true,
    });
  });

  it("stores the TOTP challenge and redirects to /totp when MFA is required", async () => {
    const challenge = {
      challenge: "challenge-123",
      expiresAt: "2099-01-01T00:00:00.000Z",
      userId: "user-1",
    };
    mocks.login.mockRejectedValue({ challenge });
    mocks.isTotpRequiredError.mockReturnValue(true);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "daniel@example.com" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => {
      expect(sessionStorage.getItem(SS_KEYS.TOTP_LOGIN_CHALLENGE)).toBe(
        JSON.stringify(challenge),
      );
    });
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/totp",
      replace: true,
    });
  });

  it("redirects to registration when bootstrap reports there are no users", async () => {
    mocks.fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ hasUsers: false }),
    });

    render(<LoginPage />);

    await waitFor(() => {
      expect(mocks.navigate).toHaveBeenCalledWith({
        to: "/register",
        replace: true,
      });
    });
  });

  it("shows unknown_error translation when a non-Error is thrown during login", async () => {
    mocks.login.mockRejectedValue("unexpected-string-error");
    mocks.isTotpRequiredError.mockReturnValue(false);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "daniel@example.com" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("unknown_error");
    });
  });

  it("shows the error message when an Error instance is thrown during login", async () => {
    mocks.login.mockRejectedValue(new Error("invalid credentials"));
    mocks.isTotpRequiredError.mockReturnValue(false);

    render(<LoginPage />);

    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "daniel@example.com" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "login" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("invalid credentials");
    });
  });

  it("shows validation error for invalid email format on submit", async () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("email");
    fireEvent.change(emailInput, { target: { value: "not-valid" } });
    fireEvent.blur(emailInput);
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "pw" },
    });
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(screen.getByText("validation_invalid_email")).toBeInTheDocument();
    });
  });

  it("shows password required error when password field is empty on submit", async () => {
    render(<LoginPage />);

    const emailInput = screen.getByLabelText("email");
    fireEvent.change(emailInput, { target: { value: "user@example.com" } });
    fireEvent.blur(emailInput);
    // Leave password empty
    fireEvent.submit(document.querySelector("form")!);

    await waitFor(() => {
      expect(screen.getByText("required")).toBeInTheDocument();
    });
  });

  it("does not redirect when bootstrap fetch returns non-ok response", async () => {
    mocks.fetchMock.mockResolvedValue({ ok: false });

    render(<LoginPage />);

    // Wait for fetch to complete
    await new Promise((r) => setTimeout(r, 50));

    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("does not redirect when bootstrap fetch throws", async () => {
    mocks.fetchMock.mockRejectedValue(new Error("network error"));

    render(<LoginPage />);

    await new Promise((r) => setTimeout(r, 50));

    expect(mocks.navigate).not.toHaveBeenCalled();
  });
});
