const {
  buildMonthRange,
  formatIcalDate,
  buildIcalEvent,
} = require("../../pb_hooks/lib/pure/calendar-utils.js");

describe("pb_hooks/lib/pure/calendar-utils.js", () => {
  it("builds month ranges including December rollover", () => {
    expect(buildMonthRange(3, 2026)).toEqual({
      startDate: "2026-03-01",
      endDate: "2026-04-01",
    });
    expect(buildMonthRange(12, 2026)).toEqual({
      startDate: "2026-12-01",
      endDate: "2027-01-01",
    });
  });

  it("formats iCal dates and event payloads", () => {
    expect(formatIcalDate("2026-03-15T12:34:56.000Z")).toBe("20260315");
    expect(
      buildIcalEvent({
        id: "sub_1",
        name: "Netflix",
        price: "9.99",
        currencySymbol: "$",
        nextPayment: "2026-03-15T12:34:56.000Z",
      }),
    ).toContain("SUMMARY:Netflix - $9.99");
  });
});
