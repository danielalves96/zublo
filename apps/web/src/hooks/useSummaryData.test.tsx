import { renderHook, waitFor } from "@testing-library/react";

import type { Currency, Subscription } from "@/types";
import { createQueryClientWrapper } from "@/test/query-client";

const { listActive, listCurrencies } = vi.hoisted(() => ({
  listActive: vi.fn(),
  listCurrencies: vi.fn(),
}));

vi.mock("@/services/subscriptions", () => ({
  subscriptionsService: {
    listActive,
  },
}));

vi.mock("@/services/currencies", () => ({
  currenciesService: {
    list: listCurrencies,
  },
}));

import { useSummaryData } from "./useSummaryData";

function getMockCurrency(overrides: Partial<Currency> = {}): Currency {
  return {
    id: "cur-1",
    name: "US Dollar",
    code: "USD",
    symbol: "$",
    rate: 1,
    is_main: false,
    user: "user-1",
    ...overrides,
  };
}

function getMockSubscription(
  overrides: Partial<Subscription> = {},
): Subscription {
  return {
    id: "sub-1",
    name: "Netflix",
    price: 10,
    currency: "cur-1",
    frequency: 1,
    cycle: "cycle-1",
    next_payment: "2026-04-01",
    auto_renew: true,
    start_date: "2026-01-01",
    notify: true,
    notify_days_before: 3,
    inactive: false,
    user: "user-1",
    ...overrides,
  };
}

describe("useSummaryData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("aggregates totals, converts currencies, and returns the most expensive subscription", async () => {
    const usd = getMockCurrency({
      id: "usd",
      code: "USD",
      symbol: "$",
      rate: 1,
    });
    const brl = getMockCurrency({
      id: "brl",
      code: "BRL",
      symbol: "R$",
      rate: 5,
      is_main: true,
    });

    const netflix = getMockSubscription({
      id: "sub-netflix",
      name: "Netflix",
      price: 10,
      expand: {
        currency: usd,
        cycle: { id: "cycle-month", name: "Monthly" },
      },
    });
    const gym = getMockSubscription({
      id: "sub-gym",
      name: "Gym",
      price: 52,
      frequency: 1,
      expand: {
        currency: brl,
        cycle: { id: "cycle-week", name: "Weekly" },
      },
    });

    listActive.mockResolvedValue([netflix, gym]);
    listCurrencies.mockResolvedValue([usd, brl]);

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useSummaryData("user-1"), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(listActive).toHaveBeenCalledWith("user-1");
    expect(listCurrencies).toHaveBeenCalledWith("user-1");
    expect(result.current.data).toMatchObject({
      mainSymbol: "R$",
      count: 2,
    });
    expect(result.current.data?.totalMonthly).toBeCloseTo(275.3333333333);
    expect(result.current.data?.totalYearly).toBeCloseTo(3304);
    expect(result.current.data?.totalWeekly).toBeCloseTo(63.5384615385);
    expect(result.current.data?.totalDaily).toBeCloseTo(9.0520547945);
    expect(result.current.data?.mostExpensive).toMatchObject({
      id: "sub-gym",
      name: "Gym",
    });
    expect(result.current.data?.mostExpensive?.record).toBe(gym);
  });

  it("falls back to default currency values and handles empty subscriptions", async () => {
    listActive.mockResolvedValue([]);
    listCurrencies.mockResolvedValue([]);

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useSummaryData("user-2"), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toEqual({
      totalMonthly: 0,
      totalYearly: 0,
      totalWeekly: 0,
      totalDaily: 0,
      mainSymbol: "$",
      count: 0,
      mostExpensive: null,
    });
  });

  it("uses default cycle/rate values and keeps the current most expensive item when the next one is cheaper", async () => {
    const expensive = getMockSubscription({
      id: "sub-expensive",
      name: "Expensive",
      price: 40,
      logo: "expensive.png",
      frequency: 0,
      expand: {},
    });
    const cheaper = getMockSubscription({
      id: "sub-cheap",
      name: "Cheap",
      price: 10,
      frequency: 0,
      expand: {},
    });

    listActive.mockResolvedValue([expensive, cheaper]);
    listCurrencies.mockResolvedValue([]);

    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useSummaryData("user-3"), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true);
    });

    expect(result.current.data).toMatchObject({
      totalMonthly: 50,
      mainSymbol: "$",
      count: 2,
      mostExpensive: {
        id: "sub-expensive",
        name: "Expensive",
        monthly: 40,
        logo: "expensive.png",
        record: expensive,
      },
    });
  });

  it("stays disabled when userId is empty", async () => {
    const { Wrapper } = createQueryClientWrapper();
    const { result } = renderHook(() => useSummaryData(""), {
      wrapper: Wrapper,
    });

    await waitFor(() => {
      expect(result.current.fetchStatus).toBe("idle");
    });

    expect(result.current.isEnabled).toBe(false);
    expect(listActive).not.toHaveBeenCalled();
    expect(listCurrencies).not.toHaveBeenCalled();
  });
});
