const mocks = vi.hoisted(() => ({
  get: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: { get: mocks.get },
}));

import { subscriptionHistoryService } from "./subscriptionHistory";

describe("subscriptionHistoryService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests the history of one subscription", async () => {
    mocks.get.mockResolvedValue({ events: [] });

    await expect(subscriptionHistoryService.get("sub-1")).resolves.toEqual({
      events: [],
    });
    expect(mocks.get).toHaveBeenCalledWith("/api/subscription/history?id=sub-1");
  });

  it("escapes the subscription id it puts in the query string", async () => {
    mocks.get.mockResolvedValue({ events: [] });

    await subscriptionHistoryService.get("sub 1&x=2");

    expect(mocks.get).toHaveBeenCalledWith(
      "/api/subscription/history?id=sub%201%26x%3D2",
    );
  });
});
