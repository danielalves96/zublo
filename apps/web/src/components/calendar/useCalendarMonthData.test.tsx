import { renderHook } from "@testing-library/react";

import type { Currency, Subscription } from "@/types";

import { useCalendarMonthData } from "./useCalendarMonthData";

function getCurrency(overrides: Partial<Currency> = {}): Currency {
  return {
    id: "cur-1",
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    rate: 1,
    is_main: false,
    user: "user-1",
    ...overrides,
  };
}

function getSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    name: "Netflix",
    price: 10,
    currency: "cur-1",
    frequency: 1,
    cycle: "cycle-monthly",
    next_payment: "2026-04-05",
    auto_renew: true,
    start_date: "2026-01-01",
    notify: true,
    notify_days_before: 3,
    inactive: false,
    user: "user-1",
    ...overrides,
  };
}

describe("useCalendarMonthData", () => {
  it("builds month cells, aggregates day entries, and computes selected-day totals", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-10T12:00:00Z"));

    const currencies = [
      getCurrency({ id: "cur-1", is_main: true }),
      getCurrency({ id: "cur-2", code: "BRL", symbol: "R$", rate: 5 }),
    ];
    const subscriptions = [
      getSubscription({
        id: "sub-1",
        price: 10,
        next_payment: "2026-04-05",
      }),
      getSubscription({
        id: "sub-2",
        price: 5,
        currency: "cur-2",
        next_payment: "2026-04-12",
      }),
      getSubscription({
        id: "sub-3",
        price: 20,
        next_payment: "2026-04-20",
      }),
    ];

    const { result } = renderHook(() =>
      useCalendarMonthData({
        subscriptions,
        cycles: [{ id: "cycle-monthly", name: "Monthly" }],
        currencies,
        year: 2026,
        month: 4,
        selectedDay: 20,
      }),
    );

    expect(result.current.mainCurrency).toEqual(currencies[0]);
    expect(result.current.daysInMonth).toBe(30);
    expect(result.current.allCells.slice(0, 3)).toEqual([
      { day: 29, type: "prev" },
      { day: 30, type: "prev" },
      { day: 31, type: "prev" },
    ]);
    expect(result.current.allCells.at(-1)).toEqual({ day: 2, type: "next" });
    expect(result.current.entriesByDay[5]).toHaveLength(1);
    expect(result.current.entriesByDay[12]).toHaveLength(1);
    expect(result.current.entriesByDay[20]).toHaveLength(1);
    expect(result.current.selectedEntries).toEqual([
      {
        sub: expect.objectContaining({ id: "sub-3" }),
        date: new Date(2026, 3, 20),
      },
    ]);
    expect(result.current.selectedDayTotal).toBe(20);
    expect(result.current.stats).toEqual({
      count: 3,
      total: 31,
      due: 21,
    });

    vi.useRealTimers();
  });

  it("falls back to the first currency and returns empty selected data when no day is selected", () => {
    const firstCurrency = getCurrency({ id: "cur-a", is_main: false });

    const { result } = renderHook(() =>
      useCalendarMonthData({
        subscriptions: [getSubscription({ next_payment: "2026-04-05" })],
        cycles: [{ id: "cycle-monthly", name: "Monthly" }],
        currencies: [firstCurrency],
        year: 2026,
        month: 4,
        selectedDay: null,
      }),
    );

    expect(result.current.mainCurrency).toEqual(firstCurrency);
    expect(result.current.selectedEntries).toEqual([]);
    expect(result.current.selectedDayTotal).toBe(0);
  });
});
