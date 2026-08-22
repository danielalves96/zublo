vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { api } from "@/lib/api";

import { oidcService } from "./oidc";

describe("oidcService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalizes the public OIDC config", async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ enabled: true, provider_name: "Authentik" })
      .mockResolvedValueOnce({ enabled: false });

    await expect(oidcService.getConfig()).resolves.toEqual({
      enabled: true,
      providerName: "Authentik",
    });
    await expect(oidcService.getConfig()).resolves.toEqual({
      enabled: false,
      providerName: "",
    });

    expect(api.get).toHaveBeenCalledWith("/api/auth/oidc/config", {
      cache: "no-store",
    });
  });

  it("starts the authorization flow", async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      authorization_url: "https://idp.example.com/authorize?state=state-1",
      state: "state-1",
    });

    await expect(oidcService.startAuthorization()).resolves.toEqual({
      authorizationUrl: "https://idp.example.com/authorize?state=state-1",
      state: "state-1",
    });
    expect(api.get).toHaveBeenCalledWith("/api/auth/oidc/authorize");
  });

  it("exchanges the authorization code for a session", async () => {
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      token: "token-1",
      record: { id: "user-1" },
    });

    await expect(oidcService.completeAuthorization("code-1", "state-1")).resolves.toEqual({
      token: "token-1",
      record: { id: "user-1" },
    });
    expect(api.post).toHaveBeenCalledWith("/api/auth/oidc/callback", {
      code: "code-1",
      state: "state-1",
    });
  });
});
