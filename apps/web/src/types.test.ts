import type {
  ApiKeyPermission,
  Category,
  Currency,
  Cycle,
  FilterState,
  Household,
  PaymentMethod,
  SortOption,
  User,
} from "./types";

describe("types", () => {
  it("exports all expected type shapes", () => {
    const user: User = { id: "1", email: "a@b.com", username: "u", name: "n" };
    const currency: Currency = { id: "1", name: "USD", code: "USD", symbol: "$", rate: 1, is_main: true, user: "1" };
    const category: Category = { id: "1", name: "c", user: "1" };
    const paymentMethod: PaymentMethod = { id: "1", name: "pm", user: "1" };
    const household: Household = { id: "1", name: "h", user: "1" };
    const cycle: Cycle = { id: "1", name: "Monthly" };
    const sortOption: SortOption = "name";
    const filter: FilterState = { category: [], member: [], payment: [], state: "all" };
    const perm: ApiKeyPermission = "subscriptions:read";

    expect(user.id).toBe("1");
    expect(currency.code).toBe("USD");
    expect(category.name).toBe("c");
    expect(paymentMethod.name).toBe("pm");
    expect(household.name).toBe("h");
    expect(cycle.name).toBe("Monthly");
    expect(sortOption).toBe("name");
    expect(filter.state).toBe("all");
    expect(perm).toBe("subscriptions:read");
  });
});
