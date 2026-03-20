import { renderHook, waitFor } from "@testing-library/react";

import { createQueryClientWrapper } from "@/test/query-client";

const { listRecommendations } = vi.hoisted(() => ({
  listRecommendations: vi.fn(),
}));

vi.mock("@/services/ai", () => ({
  aiService: {
    listRecommendations,
  },
}));

import { useAIRecommendations } from "./useAIRecommendations";

describe("useAIRecommendations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads recommendations for a valid user", async () => {
    const recommendations = [
      { id: "rec-1", title: "Cancel one plan" },
      { id: "rec-2", title: "Switch billing cycle" },
    ];

    listRecommendations.mockResolvedValue(recommendations);

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useAIRecommendations("user-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(listRecommendations).toHaveBeenCalledWith("user-1");
    expect(result.current.data).toEqual(recommendations);
  });

  it("stays disabled when userId is empty", async () => {
    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useAIRecommendations(""), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(result.current.isEnabled).toBe(false);
    expect(listRecommendations).not.toHaveBeenCalled();
  });
});
