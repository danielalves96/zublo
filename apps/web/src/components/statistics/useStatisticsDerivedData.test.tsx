import { renderHook } from "@testing-library/react";

import type { StatisticsGroupBy } from "@/components/statistics/statistics.types";
import type { Currency, Subscription, YearlyCost } from "@/types";

import { useStatisticsDerivedData } from "./useStatisticsDerivedData";

const currencies: Currency[] = [
  {
    id: "usd",
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    rate: 1,
    is_main: true,
    user: "user-1",
  },
  {
    id: "brl",
    code: "BRL",
    name: "Brazilian Real",
    symbol: "R$",
    rate: 5,
    is_main: false,
    user: "user-1",
  },
];

function getSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    name: "Subscription",
    price: 10,
    currency: "usd",
    frequency: 1,
    cycle: "cycle-1",
    next_payment: "2026-03-10",
    auto_renew: true,
    start_date: "2026-01-01",
    notify: true,
    notify_days_before: 3,
    inactive: false,
    user: "user-1",
    ...overrides,
  };
}

describe("useStatisticsDerivedData", () => {
  it("groups by category, payment, and member while converting to the main currency", () => {
    const subscriptions: Subscription[] = [
      getSubscription({
        id: "sub-1",
        price: 50,
        currency: "brl",
        expand: {
          currency: currencies[1],
          cycle: { id: "cycle-1", name: "Monthly" },
          category: { id: "cat-1", name: "Entertainment", user: "user-1" },
          payment_method: { id: "pm-1", name: "Visa", user: "user-1" },
          payer: { id: "hh-1", name: "Alice", user: "user-1" },
        },
      }),
      getSubscription({
        id: "sub-2",
        price: 120,
        expand: {
          currency: currencies[0],
          cycle: { id: "cycle-2", name: "Yearly" },
          category: { id: "cat-2", name: "Utilities", user: "user-1" },
          payment_method: { id: "pm-2", name: "Pix", user: "user-1" },
          payer: { id: "hh-2", name: "Bob", user: "user-1" },
        },
      }),
      getSubscription({
        id: "sub-3",
        price: 30,
        expand: {
          currency: currencies[0],
          cycle: { id: "cycle-3", name: "Monthly" },
        },
      }),
    ];

    const yearlyCosts: YearlyCost[] = Array.from({ length: 13 }, (_, index) => ({
      id: `yc-${index}`,
      user: "user-1",
      year: 2025 + Math.floor(index / 12),
      month: (index % 12) + 1,
      total: index + 0.245,
    }));

    const { result, rerender } = renderHook<
      ReturnType<typeof useStatisticsDerivedData>,
      { groupBy: StatisticsGroupBy }
    >(
      ({ groupBy }: { groupBy: StatisticsGroupBy }) =>
        useStatisticsDerivedData({
          subscriptions,
          currencies,
          yearlyCosts,
          groupBy,
        }),
      {
        initialProps: { groupBy: "category" as const },
      },
    );

    expect(result.current.mainSymbol).toBe("$");
    expect(result.current.totalMonthly).toBeCloseTo(50, 5);
    expect(result.current.totalYearly).toBeCloseTo(600, 5);
    expect(result.current.pieData).toEqual([
      { name: "Other", value: 30 },
      { name: "Entertainment", value: 10 },
      { name: "Utilities", value: 10 },
    ]);
    expect(result.current.lineData).toHaveLength(12);
    expect(result.current.lineData[0]).toEqual({ name: "2025/02", cost: 1.25 });
    expect(result.current.lineData.at(-1)).toEqual({
      name: "2026/01",
      cost: 12.24,
    });

    rerender({ groupBy: "payment" });
    expect(result.current.pieData).toHaveLength(3);
    expect(result.current.pieData[0]).toEqual({ name: "Other", value: 30 });
    expect(
      result.current.pieData.slice(1).sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    ).toEqual([
      { name: "Pix", value: 10 },
      { name: "Visa", value: 10 },
    ]);

    rerender({ groupBy: "member" });
    expect(result.current.pieData).toHaveLength(3);
    expect(result.current.pieData[0]).toEqual({ name: "Other", value: 30 });
    expect(
      result.current.pieData.slice(1).sort((left, right) =>
        left.name.localeCompare(right.name),
      ),
    ).toEqual([
      { name: "Alice", value: 10 },
      { name: "Bob", value: 10 },
    ]);
  });

  it("treats frequency of 0 as 1 when computing monthly cost (frequency || 1 branch)", () => {
    // A subscription with frequency=0 should behave like frequency=1 (monthly)
    const sub = getSubscription({
      price: 12,
      frequency: 0,
      expand: {
        currency: currencies[0], // USD, rate=1, is_main=true
        cycle: { id: "cycle-1", name: "Monthly" },
      },
    });

    const { result } = renderHook(() =>
      useStatisticsDerivedData({
        subscriptions: [sub],
        currencies,
        yearlyCosts: [],
        groupBy: "category",
      }),
    );

    // frequency=0 → || 1 → monthly cost = price/1 = 12/1 = 12
    expect(result.current.totalMonthly).toBeCloseTo(12, 5);
  });

  it("falls back to rate=1 and symbol='$' when no currency has is_main=true", () => {
    const noCurrencies: Currency[] = [
      {
        id: "eur",
        code: "EUR",
        name: "Euro",
        symbol: "€",
        rate: 0.9,
        is_main: false,
        user: "user-1",
      },
    ];

    const { result } = renderHook(() =>
      useStatisticsDerivedData({
        subscriptions: [getSubscription({ price: 10 })],
        currencies: noCurrencies,
        yearlyCosts: [],
        groupBy: "category",
      }),
    );

    // No main currency → mainSymbol defaults to "$"
    expect(result.current.mainSymbol).toBe("$");
    // mainRate defaults to 1 — price is unchanged
    expect(result.current.totalMonthly).toBeCloseTo(10, 5);
  });
});
