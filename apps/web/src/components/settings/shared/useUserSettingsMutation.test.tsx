import { renderHook, waitFor } from "@testing-library/react";

import { queryKeys } from "@/lib/queryKeys";
import { createQueryClientWrapper } from "@/test/query-client";

const { refreshUser, update } = vi.hoisted(() => ({
  refreshUser: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "user-1" },
    refreshUser,
  }),
}));

vi.mock("@/services/users", () => ({
  usersService: {
    update,
  },
}));

import { useUserSettingsMutation } from "./useUserSettingsMutation";

describe("useUserSettingsMutation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("updates the user settings and refreshes the cached user data", async () => {
    update.mockResolvedValue({ id: "user-1" });

    const { client, Wrapper } = createQueryClientWrapper();
    const invalidateQueries = vi
      .spyOn(client, "invalidateQueries")
      .mockResolvedValue(undefined);

    const { result } = renderHook(() => useUserSettingsMutation(), {
      wrapper: Wrapper,
    });

    await result.current.mutateAsync({ budget: 300 });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(update).toHaveBeenCalledWith("user-1", { budget: 300 });
    expect(refreshUser).toHaveBeenCalled();
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.user(),
    });
  });
});
