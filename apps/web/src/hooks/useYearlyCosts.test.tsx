import { renderHook, waitFor } from "@testing-library/react";

import { createQueryClientWrapper } from "@/test/query-client";

const { list } = vi.hoisted(() => ({
  list: vi.fn(),
}));

vi.mock("@/services/yearlyCosts", () => ({
  yearlyCostsService: {
    list,
  },
}));

import { useYearlyCosts } from "./useYearlyCosts";

describe("useYearlyCosts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads yearly costs for a valid user", async () => {
    const yearlyCosts = [{ id: "yc-1", year: 2026, month: 3, total: 120 }];

    list.mockResolvedValue(yearlyCosts);

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useYearlyCosts("user-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(list).toHaveBeenCalledWith("user-1");
    expect(result.current.data).toEqual(yearlyCosts);
  });

  it("stays disabled when userId is empty", async () => {
    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useYearlyCosts(""), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(result.current.isEnabled).toBe(false);
    expect(list).not.toHaveBeenCalled();
  });
});
