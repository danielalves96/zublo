const {
  isCredit,
  isExpense,
  isOneTimeCycle,
  normalizeRecordType,
  ONE_TIME_CYCLE,
  validateRecordTypeCycle,
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

  it("identifies the One-Time cycle by name", () => {
    expect(ONE_TIME_CYCLE).toBe("One-Time");
    expect(isOneTimeCycle("One-Time")).toBe(true);
    expect(isOneTimeCycle("Monthly")).toBe(false);
    expect(isOneTimeCycle("")).toBe(false);
    expect(isOneTimeCycle(undefined)).toBe(false);
    expect(isOneTimeCycle(null)).toBe(false);
  });

  describe("validateRecordTypeCycle", () => {
    it("rejects a One-Time expense, which every monthly formula would bill forever", () => {
      expect(validateRecordTypeCycle("expense", "One-Time")).toBe(
        "The One-Time cycle is reserved for credits",
      );
      // Legacy rows with no record_type are expenses too.
      expect(validateRecordTypeCycle("", "One-Time")).toBe(
        "The One-Time cycle is reserved for credits",
      );
    });

    it("accepts every other pairing", () => {
      expect(validateRecordTypeCycle("expense", "Monthly")).toBe("");
      expect(validateRecordTypeCycle("credit", "One-Time")).toBe("");
      // A recurring credit is repaired by the caller, not rejected here.
      expect(validateRecordTypeCycle("credit", "Monthly")).toBe("");
    });
  });
});
