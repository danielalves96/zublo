vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

import { api } from "@/lib/api";

import { totpService } from "./totp";

describe("totpService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls the setup endpoint", async () => {
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      secret: "abc",
    });

    await totpService.setup();

    expect(api.post).toHaveBeenCalledWith("/api/auth/totp/setup");
  });

  it("forwards payloads for verify and code-based actions", async () => {
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await totpService.verify({
      code: "123456",
      secret: "secret",
      backupCodes: ["a", "b"],
    });
    await totpService.regenerateBackup("111111");
    await totpService.disable("222222");
    await totpService.reenable("333333");
    await totpService.delete("444444");

    expect(api.post).toHaveBeenNthCalledWith(1, "/api/auth/totp/verify", {
      code: "123456",
      secret: "secret",
      backupCodes: ["a", "b"],
    });
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      "/api/auth/totp/regenerate_backup",
      { code: "111111" },
    );
    expect(api.post).toHaveBeenNthCalledWith(3, "/api/auth/totp/disable", {
      code: "222222",
    });
    expect(api.post).toHaveBeenNthCalledWith(4, "/api/auth/totp/reenable", {
      code: "333333",
    });
    expect(api.post).toHaveBeenNthCalledWith(5, "/api/auth/totp/delete", {
      code: "444444",
    });
  });
});
