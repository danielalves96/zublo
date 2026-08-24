const {
  isCredit,
  isDateInMonth,
  isExpense,
  normalizeRecordType,
} = require("../../pb_hooks/lib/pure/record-types.js");

describe("record type helpers", () => {
  it("keeps legacy and unknown values expense-compatible", () => {
    expect(normalizeRecordType("")).toBe("expense");
    expect(normalizeRecordType(undefined)).toBe("expense");
    expect(normalizeRecordType("expense")).toBe("expense");
    expect(normalizeRecordType("unknown")).toBe("expense");
    expect(isExpense("")).toBe(true);
    expect(isCredit("")).toBe(false);
  });

  it("recognizes explicit credits", () => {
    expect(normalizeRecordType("credit")).toBe("credit");
    expect(isCredit("credit")).toBe(true);
    expect(isExpense("credit")).toBe(false);
  });

  it("matches date-only and PocketBase datetime values to a month", () => {
    expect(isDateInMonth("2026-08-01", 2026, 8)).toBe(true);
    expect(isDateInMonth("2026-08-31 00:00:00.000Z", 2026, 8)).toBe(true);
    expect(isDateInMonth("2026-09-01", 2026, 8)).toBe(false);
    expect(isDateInMonth("", 2026, 8)).toBe(false);
  });
});
