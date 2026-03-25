import type { Currency, PaymentRecord, Subscription } from "@/types";

const { logoUrl } = vi.hoisted(() => ({
  logoUrl: vi.fn(() => "https://cdn.example.com/logo.png"),
}));

vi.mock("@/services/subscriptions", () => ({
  subscriptionsService: {
    logoUrl,
  },
}));

import {
  EVENT_COLORS,
  getColorForSub,
  getLogoUrl,
  getOccurrencesInMonth,
  getPaymentRecord,
  toDateOnly,
  toDateStr,
  toMain,
} from "./types";

function getSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    name: "Netflix",
    price: 20,
    currency: "cur-1",
    frequency: 1,
    cycle: "cycle-monthly",
    next_payment: "2026-03-15",
    auto_renew: true,
    start_date: "2026-01-01",
    notify: true,
    notify_days_before: 3,
    inactive: false,
    user: "user-1",
    ...overrides,
  };
}

describe("calendar types helpers", () => {
  it("formats and normalizes date strings", () => {
    expect(toDateStr(new Date(2026, 2, 5))).toBe("2026-03-05");
    expect(toDateOnly("2026-03-05T12:30:00Z")).toBe("2026-03-05");
    expect(toDateOnly("2026-03-05 08:00:00")).toBe("2026-03-05");
    expect(toDateOnly("2026-03-05-extra")).toBe("2026-03-05");
    expect(toDateOnly("")).toBe("");
    // Line 36: no ISO date pattern match – falls back to slice(0, 10)
    expect(toDateOnly("abcdefghij")).toBe("abcdefghij");
  });

  it("returns the latest paid payment record or the first unpaid one", () => {
    const records: PaymentRecord[] = [
      {
        id: "pr-1",
        subscription_id: "sub-1",
        user: "user-1",
        due_date: "2026-03-05",
      },
      {
        id: "pr-2",
        subscription_id: "sub-1",
        user: "user-1",
        due_date: "2026-03-05T10:00:00Z",
        paid_at: "2026-03-04T09:00:00Z",
      },
      {
        id: "pr-3",
        subscription_id: "sub-1",
        user: "user-1",
        due_date: "2026-03-05",
        paid_at: "2026-03-05T11:00:00Z",
      },
      {
        id: "pr-4",
        subscription_id: "sub-2",
        user: "user-1",
        due_date: "2026-03-05",
      },
    ];

    expect(getPaymentRecord(records, "sub-1", "2026-03-05")?.id).toBe("pr-3");
    expect(getPaymentRecord(records, "sub-2", "2026-03-05")?.id).toBe("pr-4");
    expect(getPaymentRecord(records, "sub-9", "2026-03-05")).toBeUndefined();
  });

  it("calculates occurrences for daily, weekly, monthly, and yearly cycles", () => {
    const cycles = [
      { id: "daily", name: "Daily" as const },
      { id: "weekly", name: "Weekly" as const },
      { id: "monthly", name: "Monthly" as const },
      { id: "yearly", name: "Yearly" as const },
    ];

    expect(
      getOccurrencesInMonth(
        getSubscription({
          cycle: "daily",
          frequency: 2,
          next_payment: "2026-03-05",
        }),
        2026,
        3,
        cycles,
      ).map((date) => date.getDate()),
    ).toEqual([
      1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31,
    ]);

    expect(
      getOccurrencesInMonth(
        getSubscription({
          cycle: "weekly",
          next_payment: "2026-03-19",
        }),
        2026,
        3,
        cycles,
      ).map((date) => date.getDate()),
    ).toEqual([5, 12, 19, 26]);

    expect(
      getOccurrencesInMonth(
        getSubscription({
          cycle: "monthly",
          next_payment: "2026-03-15",
        }),
        2026,
        3,
        cycles,
      ).map((date) => date.getDate()),
    ).toEqual([15]);

    expect(
      getOccurrencesInMonth(
        getSubscription({
          cycle: "yearly",
          next_payment: "2026-03-15",
        }),
        2026,
        3,
        cycles,
      ).map((date) => date.getDate()),
    ).toEqual([15]);
  });

  it("returns no occurrences for inactive subscriptions, missing dates, or invalid dates", () => {
    const cycles = [{ id: "monthly", name: "Monthly" as const }];

    expect(
      getOccurrencesInMonth(
        getSubscription({ inactive: true }),
        2026,
        3,
        cycles,
      ),
    ).toEqual([]);
    expect(
      getOccurrencesInMonth(
        getSubscription({ next_payment: "" }),
        2026,
        3,
        cycles,
      ),
    ).toEqual([]);
    expect(
      getOccurrencesInMonth(
        getSubscription({ next_payment: "not-a-date" }),
        2026,
        3,
        cycles,
      ),
    ).toEqual([]);

    // Line 103: datePart has fewer than 3 dash-segments, so the else branch executes.
    // "2026-03" splits into ["2026","03"] (length 2), triggering cursor = new Date("2026-03")
    expect(
      getOccurrencesInMonth(
        getSubscription({ next_payment: "2026-03", cycle: "monthly" }),
        2026,
        3,
        cycles,
      ),
    ).toHaveLength(1);
  });

  it("hits the infinite-loop guards (lines 111 and 120) for an unknown cycle name", () => {
    // When cycleName does not match Daily/Weekly/Monthly/Yearly, both add() and sub1()
    // return a new Date equal to the input date (no fields are mutated).
    // This means prev.getTime() >= cursor.getTime() (line 111) immediately fires in
    // the backward-scan loop, and next.getTime() <= cursor.getTime() (line 120) fires
    // in the forward-scan loop — covering both break branches.
    const unknownCycles = [{ id: "biweekly", name: "Biweekly" as any }];

    // next_payment lands inside the target month so the forward loop's result is non-empty
    const result = getOccurrencesInMonth(
      getSubscription({
        cycle: "biweekly",
        next_payment: "2026-03-15",
      }),
      2026,
      3,
      unknownCycles,
    );

    // Because add() returns the same date, the forward loop pushes exactly one occurrence
    // and then breaks on next.getTime() <= cursor.getTime()
    expect(result).toHaveLength(1);
    expect(result[0].getDate()).toBe(15);
  });

  it("uses freq=1 when subscription.frequency is 0 (covers || 1 fallback on line 71)", () => {
    // frequency: 0 is falsy, so `sub.frequency || 1` evaluates to 1
    const result = getOccurrencesInMonth(
      getSubscription({ cycle: "monthly", frequency: 0, next_payment: "2026-03-15" }),
      2026,
      3,
      [{ id: "monthly", name: "Monthly" as const }],
    );
    // With freq=1 and monthly cycle, exactly one occurrence in March
    expect(result).toHaveLength(1);
  });

  it("converts to the main currency, delegates logo urls, and picks deterministic colors", () => {
    const main: Currency = {
      id: "usd",
      name: "US Dollar",
      code: "USD",
      symbol: "$",
      rate: 1,
      is_main: true,
      user: "user-1",
    };
    const brl: Currency = {
      id: "brl",
      name: "Brazilian Real",
      code: "BRL",
      symbol: "R$",
      rate: 5,
      is_main: false,
      user: "user-1",
    };
    const zeroRate: Currency = {
      id: "zero",
      name: "Zero Rate",
      code: "ZZZ",
      symbol: "Z",
      rate: 0,
      is_main: false,
      user: "user-1",
    };
    const subscription = getSubscription({ id: "sub-color" });

    expect(toMain(25, undefined)).toBe(25);
    expect(toMain(25, main)).toBe(25);
    expect(toMain(100, zeroRate)).toBe(100);
    expect(toMain(25, brl)).toBe(5);
    expect(getLogoUrl(subscription)).toBe("https://cdn.example.com/logo.png");

    const color = getColorForSub(subscription, 2);
    expect(EVENT_COLORS).toContain(color);
    expect(getColorForSub(subscription, 2)).toBe(color);
  });
});
