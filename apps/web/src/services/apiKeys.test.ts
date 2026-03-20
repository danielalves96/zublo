vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    del: vi.fn(),
  },
}));

import { api } from "@/lib/api";

import { apiKeysService } from "./apiKeys";

describe("apiKeysService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists api keys and falls back to an empty list", async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ items: [{ id: "key-1" }] })
      .mockResolvedValueOnce({});

    await expect(apiKeysService.list()).resolves.toEqual([{ id: "key-1" }]);
    await expect(apiKeysService.list()).resolves.toEqual([]);

    expect(api.get).toHaveBeenCalledWith("/api/api-keys");
  });

  it("creates, updates, and deletes api keys", async () => {
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "key-1",
    });
    (api.put as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "key-1",
      name: "Updated",
    });
    (api.del as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    await apiKeysService.create("Read only", ["subscriptions:read"]);
    await apiKeysService.update("key-1", "Updated", ["calendar:read"]);
    await apiKeysService.delete("key-1");

    expect(api.post).toHaveBeenCalledWith("/api/api-keys", {
      name: "Read only",
      permissions: ["subscriptions:read"],
    });
    expect(api.put).toHaveBeenCalledWith("/api/api-keys/key-1", {
      name: "Updated",
      permissions: ["calendar:read"],
    });
    expect(api.del).toHaveBeenCalledWith("/api/api-keys/key-1");
  });
});
