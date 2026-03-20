import type { Subscription } from "@/types";

const { logoUrl } = vi.hoisted(() => ({
  logoUrl: vi.fn(),
}));

vi.mock("@/services/subscriptions", () => ({
  subscriptionsService: {
    logoUrl,
  },
}));

import { getLogoUrl } from "./utils";

describe("getLogoUrl", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("delegates logo URL resolution to the subscriptions service", () => {
    const subscription = {
      id: "sub-1",
      name: "Netflix",
    } as Subscription;

    logoUrl.mockReturnValue("https://cdn.example.com/logo.png");

    expect(getLogoUrl(subscription)).toBe("https://cdn.example.com/logo.png");
    expect(logoUrl).toHaveBeenCalledWith(subscription);
  });
});
