import {
  INITIAL_SUBSCRIPTION_FILTERS,
} from "@/components/subscriptions/subscriptionsPage.types";

describe("subscriptionsPage.types", () => {
  it("starts with empty filters and the all state", () => {
    expect(INITIAL_SUBSCRIPTION_FILTERS).toEqual({
      categories: [],
      members: [],
      payments: [],
      state: "all",
    });
  });
});
