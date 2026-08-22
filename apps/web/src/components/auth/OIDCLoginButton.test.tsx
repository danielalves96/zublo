import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { SS_KEYS } from "@/lib/constants";

const mocks = vi.hoisted(() => ({
  startAuthorization: vi.fn(),
  toastError: vi.fn(),
  assign: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${String(options.provider)}` : key,
  }),
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    error: mocks.toastError,
  },
}));

vi.mock("@/services/oidc", () => ({
  oidcService: {
    startAuthorization: mocks.startAuthorization,
  },
}));

import { OIDCLoginButton } from "./OIDCLoginButton";

describe("OIDCLoginButton", () => {
  const realLocation = Object.getOwnPropertyDescriptor(window, "location");

  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, assign: mocks.assign },
    });
  });

  // jsdom is shared across the file, so the stub has to be handed back or it
  // leaks into whatever runs next.
  afterEach(() => {
    if (realLocation) {
      Object.defineProperty(window, "location", realLocation);
    } else {
      Reflect.deleteProperty(window, "location");
    }
  });

  it("stores the issued state and redirects to the provider", async () => {
    mocks.startAuthorization.mockResolvedValue({
      authorizationUrl: "https://idp.example.com/authorize?state=state-1",
      state: "state-1",
    });

    render(<OIDCLoginButton providerName="Authentik" />);

    fireEvent.click(
      screen.getByRole("button", { name: "oidc_sign_in_with:Authentik" }),
    );

    await waitFor(() => {
      expect(mocks.assign).toHaveBeenCalledWith(
        "https://idp.example.com/authorize?state=state-1",
      );
    });
    expect(sessionStorage.getItem(SS_KEYS.OIDC_LOGIN_STATE)).toBe("state-1");
  });

  it("falls back to a generic provider label when none is configured", () => {
    render(<OIDCLoginButton providerName="" />);

    expect(
      screen.getByRole("button", { name: "oidc_sign_in_with:oidc_provider_fallback" }),
    ).toBeInTheDocument();
  });

  it("shows the error message and re-enables the button when the flow cannot start", async () => {
    mocks.startAuthorization.mockRejectedValue(new Error("OIDC is not configured"));

    render(<OIDCLoginButton providerName="Authentik" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("OIDC is not configured");
    });
    expect(button).not.toBeDisabled();
    expect(mocks.assign).not.toHaveBeenCalled();
  });

  it("shows unknown_error when a non-Error is thrown", async () => {
    mocks.startAuthorization.mockRejectedValue("boom");

    render(<OIDCLoginButton providerName="Authentik" />);
    fireEvent.click(screen.getByRole("button"));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("unknown_error");
    });
  });

  it("disables the button while the redirect is in flight", async () => {
    let resolveStart: (value: { authorizationUrl: string; state: string }) => void = () => {};
    mocks.startAuthorization.mockReturnValue(
      new Promise((resolve) => {
        resolveStart = resolve;
      }),
    );

    render(<OIDCLoginButton providerName="Authentik" />);
    const button = screen.getByRole("button");
    fireEvent.click(button);

    await waitFor(() => expect(button).toBeDisabled());
    expect(screen.getByRole("button", { name: "loading" })).toBeInTheDocument();

    resolveStart({ authorizationUrl: "https://idp.example.com/authorize", state: "s" });
    await waitFor(() => expect(mocks.assign).toHaveBeenCalled());
  });
});
