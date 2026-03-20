vi.mock("@/lib/api", () => ({
  api: {
    post: vi.fn(),
  },
}));

vi.mock("@/lib/pb", () => ({
  default: {
    collection: vi.fn(),
    filter: vi.fn(),
  },
}));

import { api } from "@/lib/api";
import pb from "@/lib/pb";

import { notificationsService } from "./notifications";

function getCollectionMock(overrides: Record<string, unknown> = {}) {
  return {
    getList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  };
}

describe("notificationsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the first config or null on empty/error", async () => {
    (pb.filter as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "filter:user-1",
    );
    (pb.collection as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(
        getCollectionMock({
          getList: vi.fn().mockResolvedValue({ items: [{ id: "cfg-1" }] }),
        }),
      )
      .mockReturnValueOnce(
        getCollectionMock({
          getList: vi.fn().mockResolvedValue({ items: [] }),
        }),
      )
      .mockReturnValueOnce(
        getCollectionMock({
          getList: vi.fn().mockRejectedValue(new Error("boom")),
        }),
      );

    await expect(notificationsService.getConfig("user-1")).resolves.toEqual({
      id: "cfg-1",
    });
    await expect(notificationsService.getConfig("user-1")).resolves.toBeNull();
    await expect(notificationsService.getConfig("user-1")).resolves.toBeNull();
  });

  it("creates, updates, and tests notification config", async () => {
    const create = vi.fn();
    const update = vi.fn();
    (pb.collection as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(getCollectionMock({ create }))
      .mockReturnValueOnce(getCollectionMock({ update }));
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      message: "sent",
    });

    await notificationsService.createConfig({ email_enabled: true });
    await notificationsService.updateConfig("cfg-1", { email_enabled: false });
    await notificationsService.test("email");

    expect(create).toHaveBeenCalledWith({ email_enabled: true });
    expect(update).toHaveBeenCalledWith("cfg-1", { email_enabled: false });
    expect(api.post).toHaveBeenCalledWith("/api/notifications/test", {
      provider: "email",
    });
  });
});
