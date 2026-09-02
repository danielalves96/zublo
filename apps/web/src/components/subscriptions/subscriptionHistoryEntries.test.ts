import type { SubscriptionHistoryEvent } from "@/types";

import {
  cycleLabel,
  priceChangePercent,
  toHistoryEntries,
} from "./subscriptionHistoryEntries";

function getEvent(
  overrides: Partial<SubscriptionHistoryEvent> = {},
): SubscriptionHistoryEvent {
  return {
    id: "evt-1",
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
    ...overrides,
  };
}

describe("cycleLabel", () => {
  it("names the cycle, and how many of them a charge covers", () => {
    expect(cycleLabel("Monthly", 1)).toBe("Monthly");
    expect(cycleLabel("Monthly", 3)).toBe("3× Monthly");
    expect(cycleLabel("", 1)).toBe("");
  });
});

describe("priceChangePercent", () => {
  it("reports the move to one decimal", () => {
    expect(priceChangePercent(10, 15)).toBe(50);
    expect(priceChangePercent(10, 7.5)).toBe(-25);
    expect(priceChangePercent(3, 3.5)).toBe(16.7);
  });

  it("has nothing to compare against a free or missing previous price", () => {
    expect(priceChangePercent(0, 10)).toBeNull();
    expect(priceChangePercent(-5, 10)).toBeNull();
  });
});

describe("toHistoryEntries", () => {
  it("describes a created event with its opening price and cycle", () => {
    expect(toHistoryEntries([getEvent()])).toEqual([
      {
        id: "evt-1",
        date: "2026-01-01",
        eventType: "created",
        labelKey: "history_event_created",
        fromPrice: null,
        toPrice: 10,
        fromText: null,
        toText: "Monthly",
        changePercent: null,
        tone: "neutral",
        backfilled: false,
      },
    ]);
  });

  it("marks a raise as an increase and a cut as a decrease", () => {
    const [raise] = toHistoryEntries([
      getEvent({ event_type: "price_changed", old_price: 10, new_price: 12 }),
    ]);
    expect(raise).toMatchObject({
      fromPrice: 10,
      toPrice: 12,
      changePercent: 20,
      tone: "increase",
    });

    const [cut] = toHistoryEntries([
      getEvent({ event_type: "price_changed", old_price: 10, new_price: 8 }),
    ]);
    expect(cut).toMatchObject({ changePercent: -20, tone: "decrease" });

    const [flat] = toHistoryEntries([
      getEvent({ event_type: "price_changed", old_price: 10, new_price: 10 }),
    ]);
    expect(flat.tone).toBe("neutral");
  });

  it("describes cycle and currency moves as label changes", () => {
    const [cycle] = toHistoryEntries([
      getEvent({
        event_type: "cycle_changed",
        old_cycle: "Monthly",
        old_frequency: 1,
        new_cycle: "Yearly",
        new_frequency: 2,
      }),
    ]);
    expect(cycle).toMatchObject({ fromText: "Monthly", toText: "2× Yearly" });

    const [currency] = toHistoryEntries([
      getEvent({
        event_type: "currency_changed",
        old_currency: "USD",
        new_currency: "EUR",
      }),
    ]);
    expect(currency).toMatchObject({ fromText: "USD", toText: "EUR" });
  });

  it("labels pause and resume without any values to show", () => {
    const entries = toHistoryEntries([
      getEvent({ id: "a", event_type: "paused" }),
      getEvent({ id: "b", event_type: "resumed" }),
    ]);

    expect(entries.map((entry) => entry.labelKey)).toEqual([
      "history_event_resumed",
      "history_event_paused",
    ]);
    expect(entries[0]).toMatchObject({
      fromPrice: null,
      toPrice: null,
      fromText: null,
      toText: null,
    });
  });

  it("flags events the upgrade migration synthesised", () => {
    expect(toHistoryEntries([getEvent({ note: "backfilled" })])[0].backfilled).toBe(
      true,
    );
    expect(toHistoryEntries([getEvent({ note: "" })])[0].backfilled).toBe(false);
  });

  it("shows the newest change first, keeping same-day changes in write order", () => {
    const entries = toHistoryEntries([
      getEvent({ id: "old", effective_date: "2026-01-01" }),
      getEvent({ id: "same-1", effective_date: "2026-03-01", event_type: "price_changed" }),
      getEvent({ id: "same-2", effective_date: "2026-03-01", event_type: "cycle_changed" }),
      getEvent({ id: "mid", effective_date: "2026-02-01", event_type: "paused" }),
    ]);

    expect(entries.map((entry) => entry.id)).toEqual([
      "same-2",
      "same-1",
      "mid",
      "old",
    ]);
  });

  it("drops events it has no way to describe", () => {
    const unknown = getEvent({
      event_type: "exploded" as SubscriptionHistoryEvent["event_type"],
    });
    expect(toHistoryEntries([unknown])).toEqual([]);
  });
});
