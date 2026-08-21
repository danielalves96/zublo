const {
  advanceDate,
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
  });

  it("falls back safely when exchange rate or cycle is missing", () => {
    expect(getPricePerMonth(100, "Unknown", 1, 0)).toBe(100);
    expect(getPricePerMonth(100, "Monthly", 4)).toBe(25);
  });
});
