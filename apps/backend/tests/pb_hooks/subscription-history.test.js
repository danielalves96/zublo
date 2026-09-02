const dateHelpers = require("../../pb_hooks/lib/date-helpers.js");
const {
  MAX_OCCURRENCES,
  TIMELINE_EVENTS,
  buildPausedRanges,
  buildPriceTimeline,
  computeSpendTotal,
  createdEvent,
  diffSubscriptionSnapshot,
  normalizeSnapshot,
  roundMoney,
  segmentAt,
  summarizePaidRecords,
} = require("../../pb_hooks/lib/pure/subscription-history.js");

const MONTHLY = { price: 10, cycleName: "Monthly", frequency: 1, currency: "USD", inactive: false };

function totalFor(overrides) {
  return computeSpendTotal({
    advanceDate: dateHelpers.advanceDate,
    segments: [{ from: "2026-01-01", price: 10, cycleName: "Monthly", frequency: 1 }],
    until: "2026-06-01",
    ...overrides,
  });
}

describe("pb_hooks/lib/pure/subscription-history.js", () => {
  describe("normalizeSnapshot", () => {
    it("fills in the defaults a partial or missing snapshot leaves out", () => {
      expect(normalizeSnapshot()).toEqual({
        price: 0,
        cycleName: "",
        frequency: 1,
        currency: "",
        inactive: false,
      });
      expect(normalizeSnapshot({ price: "12.5", frequency: 0, inactive: 1 })).toEqual({
        price: 12.5,
        cycleName: "",
        frequency: 1,
        currency: "",
        inactive: true,
      });
      expect(normalizeSnapshot({ price: "abc", frequency: 3.9 }).price).toBe(0);
      expect(normalizeSnapshot({ frequency: 3.9 }).frequency).toBe(3);
    });
  });

  describe("createdEvent", () => {
    it("opens a timeline with no previous values", () => {
      expect(createdEvent(MONTHLY, "2026-01-01 00:00:00.000Z")).toEqual({
        event_type: "created",
        effective_date: "2026-01-01",
        old_price: 0,
        new_price: 10,
        old_cycle: "",
        new_cycle: "Monthly",
        old_frequency: 0,
        new_frequency: 1,
        old_currency: "",
        new_currency: "USD",
      });
    });
  });

  describe("diffSubscriptionSnapshot", () => {
    it("reports nothing when the money-relevant fields are untouched", () => {
      expect(diffSubscriptionSnapshot(MONTHLY, { ...MONTHLY }, "2026-02-01")).toEqual([]);
    });

    it("reports a price raise with both sides of the change", () => {
      const events = diffSubscriptionSnapshot(MONTHLY, { ...MONTHLY, price: 15 }, "2026-02-01");
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        event_type: "price_changed",
        effective_date: "2026-02-01",
        old_price: 10,
        new_price: 15,
        old_cycle: "Monthly",
        new_cycle: "Monthly",
      });
    });

    it("treats a changed cycle name or frequency as the same kind of change", () => {
      const renamedCycle = diffSubscriptionSnapshot(MONTHLY, { ...MONTHLY, cycleName: "Yearly" }, "2026-02-01");
      expect(renamedCycle.map((event) => event.event_type)).toEqual(["cycle_changed"]);

      const refrequenced = diffSubscriptionSnapshot(MONTHLY, { ...MONTHLY, frequency: 3 }, "2026-02-01");
      expect(refrequenced.map((event) => event.event_type)).toEqual(["cycle_changed"]);
      expect(refrequenced[0].new_frequency).toBe(3);
    });

    it("reports currency moves and pause/resume transitions", () => {
      expect(
        diffSubscriptionSnapshot(MONTHLY, { ...MONTHLY, currency: "EUR" }, "2026-02-01")[0],
      ).toMatchObject({ event_type: "currency_changed", old_currency: "USD", new_currency: "EUR" });

      expect(
        diffSubscriptionSnapshot(MONTHLY, { ...MONTHLY, inactive: true }, "2026-02-01")[0].event_type,
      ).toBe("paused");

      expect(
        diffSubscriptionSnapshot({ ...MONTHLY, inactive: true }, MONTHLY, "2026-02-01")[0].event_type,
      ).toBe("resumed");
    });

    it("reports every change a single save made", () => {
      const events = diffSubscriptionSnapshot(
        MONTHLY,
        { price: 99, cycleName: "Yearly", frequency: 2, currency: "EUR", inactive: true },
        "2026-02-01",
      );
      expect(events.map((event) => event.event_type)).toEqual([
        "price_changed",
        "cycle_changed",
        "currency_changed",
        "paused",
      ]);
    });
  });

  describe("buildPriceTimeline", () => {
    it("falls back to the current price when the log has nothing to replay", () => {
      expect(buildPriceTimeline(undefined, { ...MONTHLY, since: "2026-01-01" })).toEqual([
        { from: "2026-01-01", price: 10, cycleName: "Monthly", frequency: 1 },
      ]);
    });

    it("returns no timeline when there is no event and no start to assume", () => {
      expect(buildPriceTimeline([], undefined)).toEqual([]);
      expect(buildPriceTimeline([null, { event_type: "paused" }], {})).toEqual([]);
    });

    it("orders events by effective date regardless of how they were stored", () => {
      const segments = buildPriceTimeline(
        [
          { event_type: "price_changed", effective_date: "2026-03-01", new_price: 15, new_cycle: "Monthly", new_frequency: 1, new_currency: "USD" },
          { event_type: "created", effective_date: "2026-01-01", new_price: 10, new_cycle: "Monthly", new_frequency: 1, new_currency: "USD" },
          { event_type: "paused", effective_date: "2026-02-01", new_price: 10 },
        ],
        {},
      );

      expect(segments).toEqual([
        { from: "2026-01-01", price: 10, cycleName: "Monthly", frequency: 1 },
        { from: "2026-03-01", price: 15, cycleName: "Monthly", frequency: 1 },
      ]);
    });

    it("carries the previous cycle and frequency through a price-only event", () => {
      const segments = buildPriceTimeline(
        [
          { event_type: "created", effective_date: "2026-01-01", new_price: 100, new_cycle: "Yearly", new_frequency: 2, new_currency: "USD" },
          { event_type: "price_changed", effective_date: "2026-06-01", new_price: 120 },
        ],
        {},
      );

      expect(segments[1]).toEqual({
        from: "2026-06-01",
        price: 120,
        cycleName: "Yearly",
        frequency: 2,
      });
    });

    it("skips undated events and collapses same-day changes into one segment", () => {
      const segments = buildPriceTimeline(
        [
          { event_type: "created", effective_date: "2026-01-01", new_price: 10, new_cycle: "Monthly", new_frequency: 1 },
          { event_type: "price_changed", effective_date: "", new_price: 999 },
          { event_type: "price_changed", effective_date: "2026-02-01", new_price: 20 },
          { event_type: "cycle_changed", effective_date: "2026-02-01", new_price: 20, new_cycle: "Yearly", new_frequency: 1 },
        ],
        {},
      );

      expect(segments).toEqual([
        { from: "2026-01-01", price: 10, cycleName: "Monthly", frequency: 1 },
        { from: "2026-02-01", price: 20, cycleName: "Yearly", frequency: 1 },
      ]);
    });

    it("exposes which event types shape the timeline", () => {
      expect(TIMELINE_EVENTS).toEqual(["created", "price_changed", "cycle_changed"]);
    });
  });

  describe("segmentAt", () => {
    const segments = [
      { from: "2026-01-01", price: 10, cycleName: "Monthly", frequency: 1 },
      { from: "2026-03-01", price: 15, cycleName: "Monthly", frequency: 1 },
    ];

    it("returns the segment in force, or nothing before the timeline started", () => {
      expect(segmentAt(segments, "2026-02-15").price).toBe(10);
      expect(segmentAt(segments, "2026-03-01").price).toBe(15);
      expect(segmentAt(segments, "2025-12-31")).toBeNull();
      expect(segmentAt(undefined, "2026-02-15")).toBeNull();
    });
  });

  describe("computeSpendTotal", () => {
    it("charges every elapsed occurrence at the price in force", () => {
      expect(totalFor()).toEqual({
        total: 60,
        payments: 6,
        firstDate: "2026-01-01",
        lastDate: "2026-06-01",
      });
    });

    it("reprices the occurrences that fall after a price change", () => {
      const result = computeSpendTotal({
        advanceDate: dateHelpers.advanceDate,
        segments: [
          { from: "2026-01-01", price: 10, cycleName: "Monthly", frequency: 1 },
          { from: "2026-04-01", price: 15, cycleName: "Monthly", frequency: 1 },
        ],
        until: "2026-06-01",
      });

      expect(result.payments).toBe(6);
      expect(result.total).toBe(75);
    });

    it("has nothing to total without segments, an end, or a way to advance", () => {
      expect(computeSpendTotal()).toEqual({ total: 0, payments: 0, firstDate: "", lastDate: "" });
      expect(totalFor({ until: "" }).payments).toBe(0);
      expect(totalFor({ advanceDate: undefined }).payments).toBe(0);
    });

    it("stops at the end date and at the payment limit", () => {
      expect(totalFor({ endDate: "2026-03-15" }).payments).toBe(3);
      expect(totalFor({ paymentLimit: 2 })).toMatchObject({ payments: 2, total: 20 });
    });

    it("starts from `since` when the caller asks for a later window", () => {
      expect(totalFor({ since: "2026-04-01" })).toMatchObject({
        payments: 3,
        firstDate: "2026-04-01",
      });
      expect(totalFor({ since: "2025-01-01" }).payments).toBe(6);
    });

    it("charges a one-time payout exactly once", () => {
      expect(
        computeSpendTotal({
          advanceDate: dateHelpers.advanceDate,
          segments: [{ from: "2026-01-01", price: 500, cycleName: "One-Time", frequency: 1 }],
          until: "2026-12-01",
        }),
      ).toMatchObject({ payments: 1, total: 500 });
    });

    it("rounds the accumulated total to cents", () => {
      expect(
        computeSpendTotal({
          advanceDate: dateHelpers.advanceDate,
          segments: [{ from: "2026-01-01", price: 0.1, cycleName: "Monthly", frequency: 1 }],
          until: "2026-03-01",
        }).total,
      ).toBe(0.3);
      expect(roundMoney(10.456)).toBe(10.46);
    });

    it("does not charge occurrences that fall inside a pause", () => {
      // February and March are unbilled; the resume day is billed again.
      expect(
        totalFor({ pausedRanges: [{ from: "2026-02-01", to: "2026-04-01" }] }),
      ).toMatchObject({
        payments: 4,
        total: 40,
        firstDate: "2026-01-01",
        lastDate: "2026-06-01",
      });

      // A pause that was never resumed runs to the end of the window.
      expect(
        totalFor({ pausedRanges: [{ from: "2026-03-01", to: "" }] }),
      ).toMatchObject({ payments: 2, total: 20, lastDate: "2026-02-01" });

      // A pause dated after the window never applies.
      expect(
        totalFor({ pausedRanges: [{ from: "2026-09-01", to: "" }] }).payments,
      ).toBe(6);
    });

    it("refuses to walk further than the occurrence ceiling", () => {
      const result = computeSpendTotal({
        advanceDate: dateHelpers.advanceDate,
        segments: [{ from: "1970-01-01", price: 1, cycleName: "Daily", frequency: 1 }],
        until: "2026-08-25",
      });

      expect(result.payments).toBe(MAX_OCCURRENCES);
    });
  });

  describe("buildPausedRanges", () => {
    const paused = (date) => ({ event_type: "paused", effective_date: date });
    const resumed = (date) => ({ event_type: "resumed", effective_date: date });

    it("pairs each pause with the resume that ended it", () => {
      expect(
        buildPausedRanges([
          { event_type: "created", effective_date: "2026-01-01" },
          resumed("2026-05-01"),
          paused("2026-03-01"),
        ]),
      ).toEqual([{ from: "2026-03-01", to: "2026-05-01" }]);
    });

    it("leaves a pause that was never resumed open-ended", () => {
      expect(buildPausedRanges([paused("2026-06-01")])).toEqual([
        { from: "2026-06-01", to: "" },
      ]);
    });

    it("ignores redundant, undated and unpaired events", () => {
      expect(
        buildPausedRanges([paused("2026-02-01"), paused("2026-03-01"), resumed("2026-04-01")]),
      ).toEqual([{ from: "2026-02-01", to: "2026-04-01" }]);

      expect(buildPausedRanges([paused(""), resumed("2026-04-01")])).toEqual([]);
      expect(buildPausedRanges(undefined)).toEqual([]);
    });
  });

  describe("summarizePaidRecords", () => {
    const segments = [{ from: "2026-01-01", price: 10, cycleName: "Monthly", frequency: 1 }];

    it("counts only records that were actually paid", () => {
      expect(
        summarizePaidRecords(
          [
            { due_date: "2026-01-01", paid_at: "2026-01-02T10:00:00.000Z", amount: 10 },
            { due_date: "2026-02-01", paid_at: "", amount: 10 },
            null,
          ],
          segments,
        ),
      ).toEqual({ total: 10, payments: 1, lastPaidDate: "2026-01-02" });
    });

    it("prices an amount-less record from the timeline, or at zero without one", () => {
      const paid = [{ due_date: "2026-02-01", paid_at: "2026-02-01T10:00:00.000Z" }];
      expect(summarizePaidRecords(paid, segments).total).toBe(10);
      expect(summarizePaidRecords(paid, undefined).total).toBe(0);
    });

    it("keeps the latest payment date across records in any order", () => {
      expect(
        summarizePaidRecords(
          [
            { due_date: "2026-03-01", paid_at: "2026-03-01T10:00:00.000Z", amount: 5 },
            { due_date: "2026-02-01", paid_at: "2026-02-01T10:00:00.000Z", amount: 5 },
          ],
          segments,
        ),
      ).toEqual({ total: 10, payments: 2, lastPaidDate: "2026-03-01" });
    });

    it("has nothing to total without records", () => {
      expect(summarizePaidRecords()).toEqual({ total: 0, payments: 0, lastPaidDate: "" });
    });
  });
});
