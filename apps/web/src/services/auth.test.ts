import type { User } from "@/types";

vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock("@/lib/pb", () => ({
  default: {
    authStore: {
      isValid: true,
      token: "token-1",
      model: { id: "user-1", name: "Daniel" },
      clear: vi.fn(),
      save: vi.fn(),
      onChange: vi.fn(),
    },
    collection: vi.fn(),
  },
}));

import { api } from "@/lib/api";
import pb from "@/lib/pb";

import {
  TotpRequiredError,
  authService,
  isTotpRequiredError,
} from "./auth";

function getCollectionMock(overrides: Record<string, unknown> = {}) {
  return {
    authWithPassword: vi.fn(),
    authRefresh: vi.fn(),
    create: vi.fn(),
    requestPasswordReset: vi.fn(),
    ...overrides,
  };
}

describe("authService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("exposes authStore state and delegates save/clear/onChange", () => {
    const unsubscribe = vi.fn();
    (pb.authStore.onChange as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      unsubscribe,
    );

    expect(authService.isValid()).toBe(true);
    expect(authService.getToken()).toBe("token-1");
    expect(authService.getModel()).toEqual({ id: "user-1", name: "Daniel" });

    authService.clear();
    authService.saveSession("token-2", { id: "user-2" } as User);
    const result = authService.onChange(vi.fn(), true);

    expect(pb.authStore.clear).toHaveBeenCalled();
    expect(pb.authStore.save).toHaveBeenCalledWith("token-2", {
      id: "user-2",
    });
    expect(pb.authStore.onChange).toHaveBeenCalledWith(expect.any(Function), true);
    expect(result).toBe(unsubscribe);
  });

  it("authenticates, refreshes, registers, and requests password reset via PocketBase", async () => {
    const authWithPassword = vi.fn().mockResolvedValue({ token: "token-1" });
    const authRefresh = vi.fn().mockResolvedValue({ token: "token-2" });
    const create = vi.fn().mockResolvedValue({ id: "user-1" });
    const requestPasswordReset = vi.fn().mockResolvedValue(undefined);
    (pb.collection as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(getCollectionMock({ authWithPassword }))
      .mockReturnValueOnce(getCollectionMock({ authRefresh }))
      .mockReturnValueOnce(getCollectionMock({ create }))
      .mockReturnValueOnce(getCollectionMock({ requestPasswordReset }));

    await authService.loginWithPassword("mail@example.com", "secret");
    await authService.refresh();
    await authService.register({
      username: "daniel",
      name: "Daniel",
      email: "mail@example.com",
      password: "secret",
      passwordConfirm: "secret",
      language: "pt_BR",
    });
    await authService.requestPasswordReset("mail@example.com");

    expect(authWithPassword).toHaveBeenCalledWith("mail@example.com", "secret");
    expect(authRefresh).toHaveBeenCalledWith();
    expect(create).toHaveBeenCalledWith({
      username: "daniel",
      name: "Daniel",
      email: "mail@example.com",
      password: "secret",
      passwordConfirm: "secret",
      language: "pt_BR",
    });
    expect(requestPasswordReset).toHaveBeenCalledWith("mail@example.com");
  });

  it("maps the TOTP login challenge response shape", async () => {
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      challenge: "challenge-1",
      expires_at: "2026-03-20T12:00:00Z",
      user_id: "user-1",
    });

    await expect(authService.startTotpLoginChallenge()).resolves.toEqual({
      challenge: "challenge-1",
      expiresAt: "2026-03-20T12:00:00Z",
      userId: "user-1",
    });

    expect(api.post).toHaveBeenCalledWith("/api/auth/totp/login-challenge");
  });

  it("completes the TOTP login challenge through the API client", async () => {
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: "token-1",
      record: { id: "user-1" },
    });

    await authService.completeTotpLoginChallenge("challenge-1", "123456");

    expect(api.post).toHaveBeenCalledWith("/api/auth/totp/login-verify", {
      challenge: "challenge-1",
      code: "123456",
    });
  });
});

describe("TotpRequiredError", () => {
  it("exposes the expected error name and challenge", () => {
    const challenge = {
      challenge: "challenge-1",
      expiresAt: "2026-03-20T12:00:00Z",
      userId: "user-1",
    };
    const error = new TotpRequiredError(challenge);

    expect(error.message).toBe("TOTP_REQUIRED");
    expect(error.name).toBe("TotpRequiredError");
    expect(error.challenge).toBe(challenge);
    expect(isTotpRequiredError(error)).toBe(true);
    expect(isTotpRequiredError(new Error("other"))).toBe(false);
  });
});
