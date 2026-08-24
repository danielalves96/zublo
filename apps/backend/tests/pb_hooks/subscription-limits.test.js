const dateHelpers = require("../../pb_hooks/lib/date-helpers.js");
const {
  advanceFiniteSchedule,
  dateOnly,
  nonNegativeInteger,
  occurrenceIsAllowed,
} = require("../../pb_hooks/lib/pure/subscription-limits.js");

function advance(overrides) {
  return advanceFiniteSchedule({
    nextPayment: "2026-01-01",
    today: "2026-01-01",
    cycleName: "Monthly",
    frequency: 1,
    endDate: "",
    paymentLimit: 0,
    paymentsCompleted: 0,
    inactive: false,
    advanceDate: dateHelpers.advanceDate,
    ...overrides,
  });
}

describe("pb_hooks/lib/pure/subscription-limits.js", () => {
  it("normalizes date-only values and positive integer limits", () => {
    expect(dateOnly("2026-03-04 00:00:00.000Z")).toBe("2026-03-04");
    expect(dateOnly("invalid")).toBe("");
    expect(nonNegativeInteger("3.9")).toBe(3);
    expect(nonNegativeInteger(0)).toBe(0);
    expect(nonNegativeInteger(Infinity)).toBe(0);
  });

  it("keeps existing unlimited schedules advancing normally", () => {
    expect(advance({ today: "2026-03-01" })).toEqual({
      nextPayment: "2026-04-01",
      paymentsCompleted: 0,
      inactive: false,
      processed: 3,
    });
  });

  it("completes on the final configured payment and preserves its due date", () => {
    expect(advance({
      today: "2026-04-15",
      paymentLimit: 3,
      paymentsCompleted: 1,
    })).toEqual({
      nextPayment: "2026-02-01",
      paymentsCompleted: 3,
      inactive: true,
      processed: 2,
    });
  });

  it("treats the end date as inclusive and stops before the next occurrence", () => {
    expect(advance({ today: "2026-04-01", endDate: "2026-03-15" })).toEqual({
      nextPayment: "2026-03-01",
      paymentsCompleted: 0,
      inactive: true,
      processed: 3,
    });
  });

  it("deactivates an invalid already-exhausted schedule without counting it twice", () => {
    expect(advance({ paymentLimit: 2, paymentsCompleted: 2 })).toEqual({
      nextPayment: "2026-01-01",
      paymentsCompleted: 2,
      inactive: true,
      processed: 0,
    });
    expect(advance({ nextPayment: "", today: "" })).toEqual({
      nextPayment: "",
      paymentsCompleted: 0,
      inactive: false,
      processed: 0,
    });
    expect(advance({
      nextPayment: "2026-05-01",
      today: "2026-04-01",
      endDate: "2026-03-31",
    })).toMatchObject({ inactive: true, processed: 0 });
  });

  it("bounds projected occurrences by both date and ordinal", () => {
    expect(occurrenceIsAllowed("2026-03-01", "2026-03-01", 2, 3)).toBe(true);
    expect(occurrenceIsAllowed("2026-03-02", "2026-03-01", 2, 3)).toBe(false);
    expect(occurrenceIsAllowed("2026-03-01", "", 3, 3)).toBe(false);
    expect(occurrenceIsAllowed("bad", "", 0, 0)).toBe(false);
  });
});
