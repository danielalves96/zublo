import { render, screen, act, waitFor } from "@testing-library/react";

// --- Mocks ---
const mockIsValid = vi.fn().mockReturnValue(false);
const mockRefresh = vi.fn().mockResolvedValue(undefined);
const mockGetModel = vi.fn().mockReturnValue(null);
const mockClear = vi.fn();
const mockLoginWithPassword = vi.fn();
const mockStartTotpLoginChallenge = vi.fn();
const mockOnChange = vi.fn().mockReturnValue(vi.fn()); // returns unsubscribe fn

vi.mock("@/services/auth", () => ({
  authService: {
    isValid: () => mockIsValid(),
    refresh: () => mockRefresh(),
    getModel: () => mockGetModel(),
    clear: () => mockClear(),
    loginWithPassword: (...a: unknown[]) => mockLoginWithPassword(...a),
    startTotpLoginChallenge: () => mockStartTotpLoginChallenge(),
    onChange: (cb: unknown) => mockOnChange(cb),
  },
  TotpRequiredError: class TotpRequiredError extends Error {
    challenge: unknown;
    constructor(challenge: unknown) {
      super("totp_required");
      this.challenge = challenge;
    }
  },
}));

const mockApiGet = vi.fn().mockResolvedValue({ isAdmin: false });
vi.mock("@/lib/api", () => ({
  api: { get: (...a: unknown[]) => mockApiGet(...a) },
}));

vi.mock("@/lib/constants", () => ({
  LS_KEYS: {
    totpTrusted: (id: string) => `totp_trusted_${id}`,
  },
}));

import { AuthProvider, useAuth } from "./AuthContext";

// Helper consumer component
function Consumer() {
  const { user, isLoading, isAdmin, logout } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="user">{user ? (user as { email: string }).email : "null"}</span>
      <span data-testid="admin">{String(isAdmin)}</span>
      <button onClick={logout}>Logout</button>
    </div>
  );
}

function LoginConsumer() {
  const { login } = useAuth();
  return (
    <button onClick={() => login("user@test.com", "password")}>Login</button>
  );
}

describe("AuthContext", () => {
  beforeEach(() => {
    mockIsValid.mockReturnValue(false);
    mockRefresh.mockResolvedValue(undefined);
    mockGetModel.mockReturnValue(null);
    mockApiGet.mockResolvedValue({ isAdmin: false });
    mockClear.mockClear();
    mockLoginWithPassword.mockReset();
    mockOnChange.mockReturnValue(vi.fn());
    // Clear localStorage items individually to avoid .clear() which is unsupported
    for (const key of Object.keys(localStorage)) {
      localStorage.removeItem(key);
    }
  });

  it("throws if useAuth is used outside AuthProvider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Consumer />)).toThrow("useAuth must be used within AuthProvider");
    vi.restoreAllMocks();
  });

  it("starts with isLoading true and transitions to false when session is invalid", async () => {
    mockIsValid.mockReturnValue(false);
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("sets user when session is valid and model exists", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetModel.mockReturnValue({ email: "valid@test.com" });
    mockApiGet.mockResolvedValue({ isAdmin: false });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("valid@test.com");
    });
    expect(screen.getByTestId("loading").textContent).toBe("false");
  });

  it("sets isAdmin true when API returns isAdmin true", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetModel.mockReturnValue({ email: "admin@test.com" });
    mockApiGet.mockResolvedValue({ isAdmin: true });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("admin").textContent).toBe("true");
    });
  });

  it("clears user when refresh throws", async () => {
    mockIsValid.mockReturnValue(true);
    mockRefresh.mockRejectedValue(new Error("session expired"));
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    expect(mockClear).toHaveBeenCalled();
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("logout clears user and isAdmin", async () => {
    mockIsValid.mockReturnValue(true);
    mockGetModel.mockReturnValue({ email: "user@test.com" });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("user@test.com"));
    act(() => {
      screen.getByRole("button", { name: "Logout" }).click();
    });
    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("null");
      expect(screen.getByTestId("admin").textContent).toBe("false");
    });
    expect(mockClear).toHaveBeenCalled();
  });

  it("login sets user", async () => {
    const fakeUser = { id: "1", email: "user@test.com", totp_enabled: false };
    mockLoginWithPassword.mockResolvedValue({ record: fakeUser });
    mockApiGet.mockResolvedValue({ isAdmin: false });
    render(
      <AuthProvider>
        <Consumer />
        <LoginConsumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));

    await act(async () => {
      screen.getByRole("button", { name: "Login" }).click();
    });
    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("user@test.com");
    });
  });
});
