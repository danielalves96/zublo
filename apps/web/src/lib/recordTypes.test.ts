import type { Subscription } from "@/types";

import {
  currentMonthKey,
  isCredit,
  isDateInMonth,
  isExpense,
  normalizeRecordType,
  ONE_TIME_CYCLE,
} from "./recordTypes";

describe("record type helpers", () => {
  it("treats missing and unknown record types as expenses for compatibility", () => {
    expect(normalizeRecordType(undefined)).toBe("expense");
    expect(normalizeRecordType("expense")).toBe("expense");
    expect(normalizeRecordType("other" as Subscription["record_type"])).toBe("expense");
    expect(isExpense({})).toBe(true);
    expect(isCredit({})).toBe(false);
  });

  it("recognizes credits and compares their local calendar month", () => {
    expect(isCredit({ record_type: "credit" })).toBe(true);
    expect(isExpense({ record_type: "credit" })).toBe(false);
    expect(isDateInMonth("2026-08-31 00:00:00.000Z", new Date(2026, 7, 1))).toBe(true);
    expect(isDateInMonth("2026-09-01", new Date(2026, 7, 1))).toBe(false);
  });

  it("names the One-Time cycle", () => {
    expect(ONE_TIME_CYCLE).toBe("One-Time");
  });

  it("builds a zero-padded month cache key, defaulting to today", () => {
    expect(currentMonthKey(new Date(2026, 7, 15))).toBe("2026-08");
    expect(currentMonthKey(new Date(2026, 11, 1))).toBe("2026-12");
    // The default argument is what useSummaryData relies on.
    expect(currentMonthKey()).toMatch(/^\d{4}-\d{2}$/);
  });
});
