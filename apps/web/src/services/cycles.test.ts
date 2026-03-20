vi.mock("@/lib/pb", () => ({
  default: {
    collection: vi.fn(),
  },
}));

import pb from "@/lib/pb";

import { cyclesService } from "./cycles";

describe("cyclesService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists global cycles through PocketBase", async () => {
    const getFullList = vi.fn().mockResolvedValue([]);
    (pb.collection as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      getFullList,
    });

    await cyclesService.list();

    expect(pb.collection).toHaveBeenCalledWith("cycles");
    expect(getFullList).toHaveBeenCalledWith();
  });
});
