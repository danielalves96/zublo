import type { Currency } from "@/types";

vi.mock("@/lib/pb", () => ({
  default: {
    collection: vi.fn(),
    filter: vi.fn(),
  },
}));

import pb from "@/lib/pb";

import { currenciesService } from "./currencies";

function getCollectionMock(overrides: Record<string, unknown> = {}) {
  return {
    getFullList: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    ...overrides,
  };
}

describe("currenciesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists all currencies sorted with the main currency first", async () => {
    const getFullList = vi.fn().mockResolvedValue([]);
    (pb.filter as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "filter:user-1",
    );
    (pb.collection as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      getCollectionMock({ getFullList }),
    );

    await currenciesService.list("user-1");

    expect(pb.collection).toHaveBeenCalledWith("currencies");
    expect(pb.filter).toHaveBeenCalledWith("user = {:userId}", {
      userId: "user-1",
    });
    expect(getFullList).toHaveBeenCalledWith({
      filter: "filter:user-1",
      sort: "-is_main,name",
    });
  });

  it("lists only main currencies", async () => {
    const getFullList = vi.fn().mockResolvedValue([]);
    (pb.filter as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "filter:main:user-1",
    );
    (pb.collection as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      getCollectionMock({ getFullList }),
    );

    await currenciesService.listMain("user-1");

    expect(pb.filter).toHaveBeenCalledWith(
      "user = {:userId} && is_main = true",
      { userId: "user-1" },
    );
    expect(getFullList).toHaveBeenCalledWith({
      filter: "filter:main:user-1",
    });
  });

  it("creates currencies with a default rate when missing", async () => {
    const create = vi.fn().mockResolvedValue({ id: "cur-1" });
    (pb.collection as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      getCollectionMock({ create }),
    );

    const payload: Partial<Currency> = {
      code: "USD",
      symbol: "$",
    };

    await currenciesService.create("user-1", payload);
    await currenciesService.create("user-1", { ...payload, rate: 5 });

    expect(create).toHaveBeenNthCalledWith(1, {
      code: "USD",
      symbol: "$",
      user: "user-1",
      rate: 1,
    });
    expect(create).toHaveBeenNthCalledWith(2, {
      code: "USD",
      symbol: "$",
      user: "user-1",
      rate: 5,
    });
  });

  it("updates and deletes currencies through PocketBase", async () => {
    const update = vi.fn().mockResolvedValue({ id: "cur-1" });
    const remove = vi.fn().mockResolvedValue(undefined);
    (pb.collection as unknown as ReturnType<typeof vi.fn>)
      .mockReturnValueOnce(getCollectionMock({ update }))
      .mockReturnValueOnce(getCollectionMock({ delete: remove }));

    await currenciesService.update("cur-1", { symbol: "R$" });
    await currenciesService.delete("cur-1");

    expect(update).toHaveBeenCalledWith("cur-1", { symbol: "R$" });
    expect(remove).toHaveBeenCalledWith("cur-1");
  });
});
