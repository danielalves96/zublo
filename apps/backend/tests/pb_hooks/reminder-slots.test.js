const { normalizeReminderSlots } = require("../../pb_hooks/lib/pure/reminder-slots.js");

const DEFAULT = [{ days: 3, hour: 8 }];

describe("pb_hooks/lib/pure/reminder-slots.js", () => {
  // ── happy paths ────────────────────────────────────────────────

  it("returns a plain array of slots unchanged", () => {
    expect(normalizeReminderSlots([{ days: 1, hour: 9 }, { days: 7, hour: 18 }])).toEqual([
      { days: 1, hour: 9 },
      { days: 7, hour: 18 },
    ]);
  });

  it("parses a valid JSON string containing an array of slots", () => {
    expect(normalizeReminderSlots('[{"days":5,"hour":10}]')).toEqual([{ days: 5, hour: 10 }]);
  });

  it("truncates fractional days and hours to integers", () => {
    expect(normalizeReminderSlots([{ days: 2.9, hour: 8.7 }])).toEqual([{ days: 2, hour: 8 }]);
  });

  it("accepts an array-like object (numeric .length) and iterates it", () => {
    const arrayLike = { 0: { days: 4, hour: 6 }, 1: { days: 1, hour: 20 }, length: 2 };
    expect(normalizeReminderSlots(arrayLike)).toEqual([
      { days: 4, hour: 6 },
      { days: 1, hour: 20 },
    ]);
  });

  // ── fallback paths ─────────────────────────────────────────────

  it("returns the default fallback for null", () => {
    expect(normalizeReminderSlots(null)).toEqual(DEFAULT);
  });

  it("returns the default fallback for undefined", () => {
    expect(normalizeReminderSlots(undefined)).toEqual(DEFAULT);
  });

  it("returns the default fallback for an empty string", () => {
    expect(normalizeReminderSlots("")).toEqual(DEFAULT);
  });

  it("returns the default fallback for an empty array", () => {
    expect(normalizeReminderSlots([])).toEqual(DEFAULT);
  });

  it("returns the default fallback for a plain object (no .length, not array)", () => {
    expect(normalizeReminderSlots({ days: 3, hour: 8 })).toEqual(DEFAULT);
  });

  it("returns the default fallback when JSON parsing fails (malformed string)", () => {
    expect(normalizeReminderSlots("{not valid json")).toEqual(DEFAULT);
  });

  // ── invalid slot filtering ─────────────────────────────────────

  it("drops slots where days is not a finite number (NaN, Infinity, string)", () => {
    expect(
      normalizeReminderSlots([
        { days: NaN, hour: 8 },
        { days: Infinity, hour: 8 },
        { days: "x", hour: 8 },
      ]),
    ).toEqual(DEFAULT);
  });

  it("drops slots where hour is not a finite number", () => {
    expect(normalizeReminderSlots([{ days: 3, hour: NaN }])).toEqual(DEFAULT);
  });

  it("coerces null slots to {days:0, hour:0} because Number(null) === 0 (finite)", () => {
    // null && null.days short-circuits to null; Number(null) = 0 which is finite,
    // so null slots are NOT dropped — they become {days:0, hour:0}.
    expect(normalizeReminderSlots([null, { days: 2, hour: 10 }])).toEqual([
      { days: 0, hour: 0 },
      { days: 2, hour: 10 },
    ]);
  });

  it("keeps valid slots, coerces null, and drops NaN slots in a mixed array", () => {
    expect(
      normalizeReminderSlots([
        { days: 1, hour: 7 },
        { days: NaN, hour: 8 },
        { days: 5, hour: 22 },
        null,
      ]),
    ).toEqual([
      { days: 1, hour: 7 },
      { days: 5, hour: 22 },
      { days: 0, hour: 0 },
    ]);
  });
});
