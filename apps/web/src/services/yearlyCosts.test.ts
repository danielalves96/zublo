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

import { yearlyCostsService } from "./yearlyCosts";

describe("yearlyCostsService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists yearly costs sorted by year and month", async () => {
    const getFullList = vi.fn().mockResolvedValue([]);
    (pb.filter as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      "filter:user-1",
    );
    (pb.collection as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      getFullList,
    });

    await yearlyCostsService.list("user-1");

    expect(pb.collection).toHaveBeenCalledWith("yearly_costs");
    expect(pb.filter).toHaveBeenCalledWith("user = {:userId}", {
      userId: "user-1",
    });
    expect(getFullList).toHaveBeenCalledWith({
      filter: "filter:user-1",
      sort: "year,month",
    });
  });

  it("triggers a costs snapshot through the API client", async () => {
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
    });

    await yearlyCostsService.snapshot();

    expect(api.post).toHaveBeenCalledWith("/api/costs/snapshot");
  });
});
