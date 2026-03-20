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

import { fixerService } from "./fixer";

function getCollectionMock(overrides: Record<string, unknown> = {}) {
  return {
    getList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    ...overrides,
  };
}

describe("fixerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the first fixer settings record or null on empty/error", async () => {
    (pb.filter as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "filter:user-1",
    );
    (pb.collection as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(
        getCollectionMock({
          getList: vi.fn().mockResolvedValue({ items: [{ id: "fixer-1" }] }),
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

    await expect(fixerService.getSettings("user-1")).resolves.toEqual({
      id: "fixer-1",
    });
    await expect(fixerService.getSettings("user-1")).resolves.toBeNull();
    await expect(fixerService.getSettings("user-1")).resolves.toBeNull();
  });

  it("creates and updates fixer settings", async () => {
    const create = vi.fn();
    const update = vi.fn();
    (pb.collection as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(getCollectionMock({ create }))
      .mockReturnValueOnce(getCollectionMock({ update }));

    await fixerService.createSettings({ enabled: true });
    await fixerService.updateSettings("fixer-1", { enabled: false });

    expect(create).toHaveBeenCalledWith({ enabled: true });
    expect(update).toHaveBeenCalledWith("fixer-1", { enabled: false });
  });

  it("triggers a rates update through the API client", async () => {
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      updated: 5,
      base: "USD",
    });

    await fixerService.updateRates();

    expect(api.post).toHaveBeenCalledWith("/api/fixer/update", {});
  });

  it("returns the last exchange update from getter access, property access, or null on error", async () => {
    const getWithGetter = vi.fn().mockResolvedValue({
      items: [
        {
          get: vi.fn().mockReturnValue("2026-03-20T10:00:00Z"),
          last_update: "ignored",
        },
      ],
    });
    const getWithProperty = vi.fn().mockResolvedValue({
      items: [{ last_update: "2026-03-21T10:00:00Z" }],
    });
    const getFailure = vi.fn().mockRejectedValue(new Error("boom"));
    (pb.collection as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(getCollectionMock({ getList: getWithGetter }))
      .mockReturnValueOnce(getCollectionMock({ getList: getWithProperty }))
      .mockReturnValueOnce(getCollectionMock({ getList: getFailure }));

    await expect(fixerService.getLastUpdate()).resolves.toBe(
      "2026-03-20T10:00:00Z",
    );
    await expect(fixerService.getLastUpdate()).resolves.toBe(
      "2026-03-21T10:00:00Z",
    );
    await expect(fixerService.getLastUpdate()).resolves.toBeNull();

    expect(getWithGetter).toHaveBeenCalledWith(1, 1, { sort: "-last_update" });
  });
});
