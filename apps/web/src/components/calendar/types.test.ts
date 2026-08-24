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
  parseLocalDate,
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
    ).toEqual([1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25, 27, 29, 31]);

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

  it("never projects occurrences before the subscription start date", () => {
    const cycles = [
      { id: "monthly", name: "Monthly" as const },
      { id: "yearly", name: "Yearly" as const },
      { id: "weekly", name: "Weekly" as const },
    ];

    const monthly = getSubscription({
      cycle: "monthly",
      start_date: "2026-01-01",
      next_payment: "2026-03-15",
    });

    // Regression (#19): months before the start date must stay empty.
    expect(getOccurrencesInMonth(monthly, 2025, 12, cycles)).toEqual([]);
    expect(getOccurrencesInMonth(monthly, 2025, 6, cycles)).toEqual([]);
    expect(getOccurrencesInMonth(monthly, 2026, 1, cycles).map((date) => date.getDate())).toEqual([
      15,
    ]);

    // Non-monthly cycles honour the start date as well.
    expect(
      getOccurrencesInMonth(
        getSubscription({
          cycle: "yearly",
          start_date: "2026-01-01",
          next_payment: "2026-03-15",
        }),
        2025,
        3,
        cycles,
      ),
    ).toEqual([]);

    // A start date inside the rendered month only hides the earlier occurrences.
    expect(
      getOccurrencesInMonth(
        getSubscription({
          cycle: "weekly",
          start_date: "2026-03-10",
          next_payment: "2026-03-24",
        }),
        2026,
        3,
        cycles,
      ).map((date) => date.getDate()),
    ).toEqual([10, 17, 24, 31]);

    // Subscriptions without a start date keep their previous behaviour.
    expect(
      getOccurrencesInMonth(
        getSubscription({
          cycle: "monthly",
          start_date: "",
          next_payment: "2026-03-15",
        }),
        2025,
        12,
        cycles,
      ).map((date) => date.getDate()),
    ).toEqual([15]);
  });

  it("stops projecting occurrences after a scheduled cancellation date", () => {
    const cycles = [{ id: "daily", name: "Daily" as const }];

    const cancelled = getSubscription({
      cycle: "daily",
      frequency: 10,
      start_date: "2026-01-01",
      next_payment: "2026-03-01",
      cancellation_date: "2026-03-21",
    });

    // March would hold the 1st, 11th, 21st and 31st — the 31st is after the end.
    expect(getOccurrencesInMonth(cancelled, 2026, 3, cycles).map((date) => date.getDate())).toEqual(
      [1, 11, 21],
    );

    // Months entirely after the cancellation date are empty.
    expect(getOccurrencesInMonth(cancelled, 2026, 4, cycles)).toEqual([]);

    // A cancellation date after the rendered month changes nothing.
    expect(
      getOccurrencesInMonth(
        getSubscription({
          ...cancelled,
          cancellation_date: "2027-01-01",
        }),
        2026,
        3,
        cycles,
      ).map((date) => date.getDate()),
    ).toEqual([1, 11, 21, 31]);
  });

  it("stops projections at the inclusive finite end date", () => {
    const cycles = [{ id: "monthly", name: "Monthly" as const }];
    const finite = getSubscription({
      cycle: "monthly",
      start_date: "2026-01-01",
      next_payment: "2026-03-15",
      end_date: "2026-04-20",
      cancellation_date: "2026-04-30",
    });

    expect(getOccurrencesInMonth(finite, 2026, 3, cycles).map((date) => date.getDate())).toEqual([
      15,
    ]);
    expect(getOccurrencesInMonth(finite, 2026, 4, cycles).map((date) => date.getDate())).toEqual([
      15,
    ]);
    expect(getOccurrencesInMonth(finite, 2026, 5, cycles)).toEqual([]);
  });

  it("uses completed and total payments to bound installment projections", () => {
    const cycles = [{ id: "monthly", name: "Monthly" as const }];
    const installments = getSubscription({
      cycle: "monthly",
      start_date: "2026-01-01",
      next_payment: "2026-04-15",
      payment_limit: 3,
      payments_completed: 1,
    });

    // The next payment is installment 2/3; one historical and two remaining
    // occurrences are visible, but there is no fourth installment.
    expect(
      getOccurrencesInMonth(installments, 2026, 3, cycles).map((date) => date.getDate()),
    ).toEqual([15]);
    expect(
      getOccurrencesInMonth(installments, 2026, 4, cycles).map((date) => date.getDate()),
    ).toEqual([15]);
    expect(
      getOccurrencesInMonth(installments, 2026, 5, cycles).map((date) => date.getDate()),
    ).toEqual([15]);
    expect(getOccurrencesInMonth(installments, 2026, 6, cycles)).toEqual([]);
  });

  it("keeps history for a completed finite schedule but hides a merely paused one", () => {
    const cycles = [{ id: "monthly", name: "Monthly" as const }];
    const base = {
      cycle: "monthly",
      start_date: "2026-01-01",
      inactive: true,
    };

    // Completed by count: next_payment is the final installment, so March still
    // shows it and nothing is projected past the limit.
    const completedByCount = getSubscription({
      ...base,
      next_payment: "2026-03-15",
      payment_limit: 3,
      payments_completed: 3,
    });
    expect(
      getOccurrencesInMonth(completedByCount, 2026, 3, cycles).map((date) => date.getDate()),
    ).toEqual([15]);
    expect(getOccurrencesInMonth(completedByCount, 2026, 4, cycles)).toEqual([]);

    // Completed by date: the occurrence after next_payment would pass end_date.
    const completedByDate = getSubscription({
      ...base,
      next_payment: "2026-03-15",
      end_date: "2026-03-20",
    });
    expect(
      getOccurrencesInMonth(completedByDate, 2026, 3, cycles).map((date) => date.getDate()),
    ).toEqual([15]);
    expect(getOccurrencesInMonth(completedByDate, 2026, 4, cycles)).toEqual([]);

    // Paused mid-schedule: having a bound is not the same as having reached it,
    // so none of the remaining payments may be projected.
    const pausedByCount = getSubscription({
      ...base,
      next_payment: "2026-04-15",
      payment_limit: 12,
      payments_completed: 3,
    });
    expect(getOccurrencesInMonth(pausedByCount, 2026, 4, cycles)).toEqual([]);
    expect(getOccurrencesInMonth(pausedByCount, 2026, 6, cycles)).toEqual([]);

    const pausedByDate = getSubscription({
      ...base,
      next_payment: "2026-04-15",
      end_date: "2027-01-15",
    });
    expect(getOccurrencesInMonth(pausedByDate, 2026, 4, cycles)).toEqual([]);
    expect(getOccurrencesInMonth(pausedByDate, 2026, 6, cycles)).toEqual([]);
  });

  it("projects quarterly and half-yearly finite schedules", () => {
    const cycles = [
      { id: "quarterly", name: "Quarterly" as const },
      { id: "half-yearly", name: "Half-Yearly" as const },
    ];

    expect(
      getOccurrencesInMonth(
        getSubscription({ cycle: "quarterly", next_payment: "2026-01-31" }),
        2026,
        4,
        cycles,
      ).map((date) => date.getDate()),
    ).toEqual([30]);
    expect(
      getOccurrencesInMonth(
        getSubscription({ cycle: "half-yearly", next_payment: "2026-01-31" }),
        2026,
        7,
        cycles,
      ).map((date) => date.getDate()),
    ).toEqual([31]);

    expect(
      getOccurrencesInMonth(
        getSubscription({ cycle: "quarterly", next_payment: "2026-07-31" }),
        2026,
        4,
        cycles,
      ).map((date) => date.getDate()),
    ).toEqual([30]);
    expect(
      getOccurrencesInMonth(
        getSubscription({ cycle: "half-yearly", next_payment: "2026-07-31" }),
        2026,
        1,
        cycles,
      ).map((date) => date.getDate()),
    ).toEqual([31]);
  });

  it("keeps credits one-time even when stale finite-schedule fields are present", () => {
    const cycles = [{ id: "one-time", name: "One-Time" as const }];
    const credit = getSubscription({
      record_type: "credit",
      cycle: "one-time",
      next_payment: "2026-03-15",
      payment_limit: 1,
      payments_completed: 1,
      end_date: "2026-02-01",
    });

    expect(getOccurrencesInMonth(credit, 2026, 3, cycles).map((date) => date.getDate())).toEqual([
      15,
    ]);
    expect(getOccurrencesInMonth(credit, 2026, 2, cycles)).toEqual([]);
    expect(getOccurrencesInMonth(credit, 2026, 4, cycles)).toEqual([]);
  });

  it("returns no occurrences for inactive subscriptions, missing dates, or invalid dates", () => {
    const cycles = [{ id: "monthly", name: "Monthly" as const }];

    expect(getOccurrencesInMonth(getSubscription({ inactive: true }), 2026, 3, cycles)).toEqual([]);
    expect(getOccurrencesInMonth(getSubscription({ next_payment: "" }), 2026, 3, cycles)).toEqual(
      [],
    );
    expect(
      getOccurrencesInMonth(getSubscription({ next_payment: "not-a-date" }), 2026, 3, cycles),
    ).toEqual([]);
    // A single-segment value falls through to new Date(value), which is invalid too
    expect(
      getOccurrencesInMonth(getSubscription({ next_payment: "nonsense" }), 2026, 3, cycles),
    ).toEqual([]);

    // datePart has fewer than 3 dash-segments, so the else branch executes.
    // "2026-03" splits into ["2026","03"] (length 2), triggering new Date("2026-03")
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

  it("parses stored dates as local calendar days and rejects impossible ones", () => {
    expect(parseLocalDate("2026-03-15")).toEqual(new Date(2026, 2, 15));
    // The stored form carries a time and a zone; only the calendar day matters.
    expect(parseLocalDate("2026-03-15 10:30:00.000Z")).toEqual(new Date(2026, 2, 15));
    expect(parseLocalDate("2026-03-15T10:30:00.000Z")).toEqual(new Date(2026, 2, 15));

    // Date would roll these into the following month instead of failing.
    expect(parseLocalDate("2026-02-31")).toBe(null);
    expect(parseLocalDate("2026-13-01")).toBe(null);
    expect(parseLocalDate("2026-00-10")).toBe(null);

    // Anything that is not the stored shape still goes through Date, but is
    // flattened to local midnight so bounds stay comparable.
    expect(parseLocalDate("2026-3-15")).toEqual(new Date(2026, 2, 15));

    expect(parseLocalDate("not-a-date")).toBe(null);
    expect(parseLocalDate("")).toBe(null);
    expect(parseLocalDate(undefined)).toBe(null);
    expect(parseLocalDate(null)).toBe(null);
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
