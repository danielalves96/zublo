vi.mock("@/lib/pb", () => ({
  default: {
    collection: vi.fn(),
    filter: vi.fn(),
  },
}));

import pb from "@/lib/pb";

import { categoriesService } from "./categories";

function getCollectionMock(overrides: Record<string, unknown> = {}) {
  return {
    getFullList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  };
}

describe("categoriesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists categories sorted by name", async () => {
    const getFullList = vi.fn().mockResolvedValue([]);
    (pb.filter as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "filter:user-1",
    );
    (pb.collection as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      getCollectionMock({ getFullList }),
    );

    await categoriesService.list("user-1");

    expect(pb.collection).toHaveBeenCalledWith("categories");
    expect(pb.filter).toHaveBeenCalledWith("user = {:userId}", {
      userId: "user-1",
    });
    expect(getFullList).toHaveBeenCalledWith({
      filter: "filter:user-1",
      sort: "name",
    });
  });

  it("creates, updates, and deletes categories", async () => {
    const create = vi.fn();
    const update = vi.fn();
    const remove = vi.fn();
    (pb.collection as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(getCollectionMock({ create }))
      .mockReturnValueOnce(getCollectionMock({ update }))
      .mockReturnValueOnce(getCollectionMock({ delete: remove }));

    await categoriesService.create("user-1", "Streaming");
    await categoriesService.update("cat-1", "Music");
    await categoriesService.delete("cat-1");

    expect(create).toHaveBeenCalledWith({
      name: "Streaming",
      user: "user-1",
    });
    expect(update).toHaveBeenCalledWith("cat-1", { name: "Music" });
    expect(remove).toHaveBeenCalledWith("cat-1");
  });
});
