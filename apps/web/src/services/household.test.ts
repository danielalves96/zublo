vi.mock("@/lib/pb", () => ({
  default: {
    collection: vi.fn(),
    filter: vi.fn(),
  },
}));

import pb from "@/lib/pb";

import { householdService } from "./household";

function getCollectionMock(overrides: Record<string, unknown> = {}) {
  return {
    getFullList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  };
}

describe("householdService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists household members sorted by name", async () => {
    const getFullList = vi.fn().mockResolvedValue([]);
    (pb.filter as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "filter:user-1",
    );
    (pb.collection as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      getCollectionMock({ getFullList }),
    );

    await householdService.list("user-1");

    expect(pb.collection).toHaveBeenCalledWith("household");
    expect(pb.filter).toHaveBeenCalledWith("user = {:userId}", {
      userId: "user-1",
    });
    expect(getFullList).toHaveBeenCalledWith({
      filter: "filter:user-1",
      sort: "name",
    });
  });

  it("creates, updates, and deletes household members", async () => {
    const create = vi.fn();
    const update = vi.fn();
    const remove = vi.fn();
    (pb.collection as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(getCollectionMock({ create }))
      .mockReturnValueOnce(getCollectionMock({ update }))
      .mockReturnValueOnce(getCollectionMock({ delete: remove }));

    await householdService.create("user-1", "Daniel");
    await householdService.update("member-1", "Ana");
    await householdService.delete("member-1");

    expect(create).toHaveBeenCalledWith({
      name: "Daniel",
      user: "user-1",
    });
    expect(update).toHaveBeenCalledWith("member-1", { name: "Ana" });
    expect(remove).toHaveBeenCalledWith("member-1");
  });
});
