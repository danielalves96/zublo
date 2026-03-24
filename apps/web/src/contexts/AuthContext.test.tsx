import React from "react";
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

const mockGetItem = vi.fn();
const mockSetItem = vi.fn();
const mockRemoveItem = vi.fn();

Object.defineProperty(window, "localStorage", {
  value: {
    getItem: mockGetItem,
    setItem: mockSetItem,
    removeItem: mockRemoveItem,
  },
  writable: true,
});

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
    mockStartTotpLoginChallenge.mockClear();
    mockLoginWithPassword.mockReset();
    mockOnChange.mockReturnValue(vi.fn());
    mockGetItem.mockReset();
    mockSetItem.mockReset();
    mockRemoveItem.mockReset();
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

  it("onChange callback clears user when token is null", async () => {
    let capturedOnChange: (token: string | null, model: unknown) => void = () => {};
    mockOnChange.mockImplementation((cb: (token: string | null, model: unknown) => void) => {
      capturedOnChange = cb;
      return vi.fn();
    });
    mockIsValid.mockReturnValue(true);
    mockGetModel.mockReturnValue({ email: "user@test.com" });
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("user").textContent).toBe("user@test.com"));

    act(() => {
      capturedOnChange(null, null);
    });
    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("null");
      expect(screen.getByTestId("admin").textContent).toBe("false");
    });
  });

  it("onChange callback updates user when model is provided", async () => {
    let capturedOnChange: (token: string | null, model: unknown) => void = () => {};
    mockOnChange.mockImplementation((cb: (token: string | null, model: unknown) => void) => {
      capturedOnChange = cb;
      return vi.fn();
    });
    mockIsValid.mockReturnValue(false);
    render(
      <AuthProvider>
        <Consumer />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));

    act(() => {
      capturedOnChange("token123", { email: "updated@test.com" });
    });
    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("updated@test.com");
    });
  });

  it("login throws TotpRequiredError for untrusted device with TOTP", async () => {
    const fakeUser = { id: "u1", email: "totp@test.com", totp_enabled: true };
    mockLoginWithPassword.mockResolvedValue({ record: fakeUser });
    mockStartTotpLoginChallenge.mockResolvedValue({ challengeId: "ch1" });
    // Ensure no trusted entry
    mockGetItem.mockReturnValue(null);

    let loginFn: (email: string, password: string) => Promise<void>;
    function LoginHelper() {
      const { login } = useAuth();
      loginFn = login;
      return null;
    }

    render(
      <AuthProvider>
        <LoginHelper />
      </AuthProvider>,
    );
    await waitFor(() => {});

    await expect(act(() => loginFn!("totp@test.com", "password"))).rejects.toThrow("totp_required");
    expect(mockStartTotpLoginChallenge).toHaveBeenCalled();
    expect(mockClear).toHaveBeenCalled();
  });

  it("login skips TOTP check for trusted device", async () => {
    const fakeUser = { id: "u2", email: "trusted@test.com", totp_enabled: true };
    mockLoginWithPassword.mockResolvedValue({ record: fakeUser });
    // Set trusted entry far in the future
    mockGetItem.mockReturnValue(String(Date.now() + 999999999));
    mockApiGet.mockResolvedValue({ isAdmin: false });

    function LoginHelper() {
      const { login } = useAuth();
      return <button onClick={() => login("trusted@test.com", "password")}>Login</button>;
    }

    render(
      <AuthProvider>
        <Consumer />
        <LoginHelper />
      </AuthProvider>,
    );
    await waitFor(() => expect(screen.getByTestId("loading").textContent).toBe("false"));

    await act(async () => {
      screen.getByRole("button", { name: "Login" }).click();
    });
    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("trusted@test.com");
    });
    expect(mockStartTotpLoginChallenge).not.toHaveBeenCalled();
  });

  it("does not set user when refresh succeeds but getModel returns null", async () => {
    mockIsValid.mockReturnValue(true);
    mockRefresh.mockResolvedValue(undefined);
    mockGetModel.mockReturnValue(null); // record is null
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

  it("does not call refreshUser again when AuthProvider re-renders (didBootstrapRef guard)", async () => {
    mockIsValid.mockReturnValue(false);
    // React StrictMode runs effects twice to help detect side effects
    render(
      <React.StrictMode>
        <AuthProvider>
          <Consumer />
        </AuthProvider>
      </React.StrictMode>,
    );
    await waitFor(() => {
      expect(screen.getByTestId("loading").textContent).toBe("false");
    });
    // In StrictMode, effects run twice; the guard ensures refreshUser runs only once
    expect(screen.getByTestId("user").textContent).toBe("null");
  });

  it("login reuses cached isAdmin when already fetched (nextIsAdmin !== undefined)", async () => {
    // First bootstrap: valid session with admin=true already cached in isAdminRef
    mockIsValid.mockReturnValue(true);
    mockGetModel.mockReturnValue({ email: "admin@test.com" });
    mockApiGet.mockResolvedValue({ isAdmin: true });

    const fakeUser = { id: "u3", email: "admin@test.com", totp_enabled: false };
    mockLoginWithPassword.mockResolvedValue({ record: fakeUser });

    function LoginHelper() {
      const { login } = useAuth();
      return <button onClick={() => login("admin@test.com", "password")}>Login</button>;
    }

    render(
      <AuthProvider>
        <Consumer />
        <LoginHelper />
      </AuthProvider>,
    );
    // Wait for bootstrap to complete and populate isAdminRef
    await waitFor(() => expect(screen.getByTestId("admin").textContent).toBe("true"));

    // Now call login — isAdminRef is already set so fetchIsAdmin should NOT be called again
    const callCount = mockApiGet.mock.calls.length;
    await act(async () => {
      screen.getByRole("button", { name: "Login" }).click();
    });
    await waitFor(() => {
      expect(screen.getByTestId("user").textContent).toBe("admin@test.com");
    });
    // fetchIsAdmin not re-called because isAdminRef.current was defined
    expect(mockApiGet.mock.calls.length).toBe(callCount);
  });
});
