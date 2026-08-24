const {
  advanceDate,
  formatLocalDate,
  getPricePerMonth,
} = require("../../pb_hooks/lib/date-helpers.js");

describe("pb_hooks/lib/date-helpers.js", () => {
  it("advances dates without mutating the original input", () => {
    const source = new Date("2026-01-31T00:00:00.000Z");
    const result = advanceDate(source, "Daily", 2);
    expect(source.toISOString()).toBe("2026-01-31T00:00:00.000Z");
    expect(result.toISOString()).toBe("2026-02-02T00:00:00.000Z");
  });

  it("handles daily, weekly, monthly, quarterly, half-yearly, and yearly cycles", () => {
    expect(
      advanceDate(new Date("2026-03-01T00:00:00.000Z"), "Daily", 3).toISOString(),
    ).toBe("2026-03-04T00:00:00.000Z");
    expect(
      advanceDate(new Date("2026-03-01T00:00:00.000Z"), "Weekly", 2).toISOString(),
    ).toBe("2026-03-15T00:00:00.000Z");
    expect(
      advanceDate(new Date("2026-01-31T00:00:00.000Z"), "Monthly", 1).toISOString(),
    ).toBe("2026-03-03T00:00:00.000Z");
    // Quarterly: 1 quarter = 3 months
    expect(
      advanceDate(new Date("2026-01-01T00:00:00.000Z"), "Quarterly", 1).toISOString(),
    ).toBe("2026-04-01T00:00:00.000Z");
    // Quarterly with frequency=2: 2 quarters = 6 months
    expect(
      advanceDate(new Date("2026-01-01T00:00:00.000Z"), "Quarterly", 2).toISOString(),
    ).toBe("2026-07-01T00:00:00.000Z");
    // Half-Yearly: 1 half-year = 6 months
    expect(
      advanceDate(new Date("2026-01-01T00:00:00.000Z"), "Half-Yearly", 1).toISOString(),
    ).toBe("2026-07-01T00:00:00.000Z");
    expect(
      advanceDate(new Date("2024-02-29T00:00:00.000Z"), "Yearly", 1).toISOString(),
    ).toBe("2025-03-01T00:00:00.000Z");
  });

  describe("timezone independence", () => {
    const realTZ = process.env.TZ;

    afterEach(() => {
      if (realTZ === undefined) Reflect.deleteProperty(process.env, "TZ");
      else process.env.TZ = realTZ;
    });

    // These dates are stored by PocketBase as UTC instants. Advancing them
    // with local accessors reads a different calendar day west of Greenwich,
    // which then overflows short months and lands a day late. Pinning the
    // timezone here makes the regression reproducible on any machine rather
    // than only on the maintainer's.
    it.each([
      ["UTC", "UTC"],
      ["a negative offset", "America/Sao_Paulo"],
      ["a positive offset", "Asia/Tokyo"],
      ["a half-hour offset", "Asia/Kolkata"],
    ])("advances by whole months in %s", (_label, timezone) => {
      process.env.TZ = timezone;

      expect(
        advanceDate(new Date("2026-01-01T00:00:00.000Z"), "Quarterly", 2).toISOString(),
      ).toBe("2026-07-01T00:00:00.000Z");
      expect(
        advanceDate(new Date("2026-01-01T00:00:00.000Z"), "Half-Yearly", 1).toISOString(),
      ).toBe("2026-07-01T00:00:00.000Z");
      expect(
        advanceDate(new Date("2026-03-15T00:00:00.000Z"), "Monthly", 1).toISOString(),
      ).toBe("2026-04-15T00:00:00.000Z");
      expect(
        advanceDate(new Date("2026-03-15T00:00:00.000Z"), "Daily", 20).toISOString(),
      ).toBe("2026-04-04T00:00:00.000Z");
      expect(
        advanceDate(new Date("2026-03-15T00:00:00.000Z"), "Weekly", 3).toISOString(),
      ).toBe("2026-04-05T00:00:00.000Z");
      expect(
        advanceDate(new Date("2026-03-15T00:00:00.000Z"), "Yearly", 1).toISOString(),
      ).toBe("2027-03-15T00:00:00.000Z");
    });
  });

  describe("formatLocalDate", () => {
    const realTZ = process.env.TZ;

    afterEach(() => {
      if (realTZ === undefined) Reflect.deleteProperty(process.env, "TZ");
      else process.env.TZ = realTZ;
    });

    it("zero-pads single-digit months and days", () => {
      expect(formatLocalDate(new Date(2026, 0, 5))).toBe("2026-01-05");
      expect(formatLocalDate(new Date(2026, 8, 9))).toBe("2026-09-09");
    });

    it("leaves two-digit months and days alone", () => {
      expect(formatLocalDate(new Date(2026, 10, 25))).toBe("2026-11-25");
      expect(formatLocalDate(new Date(2026, 11, 31))).toBe("2026-12-31");
    });

    // The whole point of the helper: an evening west of Greenwich, or any
    // late hour east of it, is a different calendar day in UTC. Serialising
    // with toISOString() there returns the neighbouring day.
    it("reports the local calendar day, not the UTC one", () => {
      process.env.TZ = "America/Sao_Paulo";
      const brazilEvening = new Date("2026-08-22T01:30:00.000Z");
      expect(brazilEvening.toISOString().slice(0, 10)).toBe("2026-08-22");
      expect(formatLocalDate(brazilEvening)).toBe("2026-08-21");

      process.env.TZ = "Asia/Tokyo";
      const tokyoLateEvening = new Date("2026-08-21T22:00:00.000Z");
      expect(tokyoLateEvening.toISOString().slice(0, 10)).toBe("2026-08-21");
      expect(formatLocalDate(tokyoLateEvening)).toBe("2026-08-22");
    });
  });

  it("computes monthly price equivalents across all supported cycles", () => {
    expect(getPricePerMonth(10, "Daily", 1, 1)).toBe(300);
    expect(getPricePerMonth(21, "Weekly", 3, 1)).toBeCloseTo(30.31, 2);
    expect(getPricePerMonth(24, "Monthly", 2, 1)).toBe(12);
    // Quarterly: $90 every quarter (3 months) → $30/month
    expect(getPricePerMonth(90, "Quarterly", 1, 1)).toBe(30);
    // Quarterly with frequency=2: $90 every 2 quarters (6 months) → $15/month
    expect(getPricePerMonth(90, "Quarterly", 2, 1)).toBe(15);
    // Half-Yearly: $60 every half-year (6 months) → $10/month
    expect(getPricePerMonth(60, "Half-Yearly", 1, 1)).toBe(10);
    expect(getPricePerMonth(120, "Yearly", 2, 1)).toBe(5);
    // One-Time is a single dated payout: it contributes nothing to a
    // recurring monthly total, however large the amount is.
    expect(getPricePerMonth(2000, "One-Time", 1, 1)).toBe(0);
  });

  it("falls back safely when exchange rate or cycle is missing", () => {
    expect(getPricePerMonth(100, "Unknown", 1, 0)).toBe(100);
    expect(getPricePerMonth(100, "Monthly", 4)).toBe(25);
  });
});
