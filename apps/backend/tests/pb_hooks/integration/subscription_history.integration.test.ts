import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  hasPocketBaseBinary,
  PocketBaseIntegrationHarness,
} from "./setup.integration";

interface CycleRecord {
  id: string;
  name: string;
}

interface CurrencyRecord {
  code: string;
  id: string;
  symbol: string;
}

interface SubscriptionRecord {
  id: string;
  name: string;
  price: number;
}

interface HistoryEvent {
  effective_date: string;
  event_type: string;
  new_currency: string;
  new_cycle: string;
  new_frequency: number;
  new_price: number;
  old_price: number;
}

interface HistoryResponse {
  error?: string;
  events: HistoryEvent[];
  subscription: { currency: string; currency_symbol: string; name: string };
  timeline: Array<{ cycleName: string; from: string; frequency: number; price: number }>;
  totals: {
    estimated_payments: number;
    estimated_total: number;
    paid_payments: number;
    paid_total: number;
    since: string;
    until: string;
  };
}

function isoDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function isoMonthsAgo(months: number): string {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

describe.skipIf(!hasPocketBaseBinary).sequential("subscription history", () => {
  const harness = new PocketBaseIntegrationHarness();

  beforeEach(async () => {
    await harness.reset();
  });

  afterAll(async () => {
    await harness.stop();
  });

  async function monthlyCycle(): Promise<CycleRecord> {
    const cycles = await harness.listRecords<CycleRecord>("cycles");
    return cycles.items.find((cycle) => cycle.name === "Monthly")!;
  }

  async function usdCurrency(): Promise<CurrencyRecord> {
    const currencies = await harness.listRecords<CurrencyRecord>("currencies");
    return currencies.items.find((currency) => currency.code === "USD")!;
  }

  async function history(id: string, token = harness.admin!.token) {
    return harness.jsonRequest<HistoryResponse>(
      `/api/subscription/history?id=${encodeURIComponent(id)}`,
      { token },
    );
  }

  it("opens a timeline on create and totals the payments made since the start", async () => {
    const cycle = await monthlyCycle();
    const currency = await usdCurrency();
    const startDate = isoMonthsAgo(6);

    const sub = await harness.createRecord<SubscriptionRecord>("subscriptions", {
      name: "Streaming",
      price: 10,
      frequency: 1,
      cycle: cycle.id,
      currency: currency.id,
      start_date: startDate,
      next_payment: isoDaysAgo(0),
      inactive: false,
      user: harness.admin!.record.id,
    });

    const result = await history(sub.id);
    expect(result.response.status, JSON.stringify(result.json)).toBe(200);
    expect(result.json.events).toHaveLength(1);
    expect(result.json.events[0]).toMatchObject({
      event_type: "created",
      effective_date: startDate,
      new_price: 10,
      new_cycle: "Monthly",
      new_currency: "USD",
    });
    expect(result.json.subscription.currency_symbol).toBe("$");
    expect(result.json.totals.since).toBe(startDate);
    // Six elapsed months plus the payment due today.
    expect(result.json.totals.estimated_payments).toBe(7);
    expect(result.json.totals.estimated_total).toBe(70);
    expect(result.json.totals.paid_payments).toBe(0);
  });

  it("records a price change and reprices only the payments after it", async () => {
    const cycle = await monthlyCycle();
    const currency = await usdCurrency();

    const sub = await harness.createRecord<SubscriptionRecord>("subscriptions", {
      name: "Music",
      price: 10,
      frequency: 1,
      cycle: cycle.id,
      currency: currency.id,
      start_date: isoMonthsAgo(3),
      next_payment: isoDaysAgo(0),
      inactive: false,
      user: harness.admin!.record.id,
    });

    const updated = await harness.jsonRequest(
      `/api/collections/subscriptions/records/${sub.id}`,
      {
        body: { price: 15 },
        method: "PATCH",
        token: harness.admin!.token,
      },
    );
    expect(updated.response.status, JSON.stringify(updated.json)).toBe(200);

    const result = await history(sub.id);
    expect(result.response.status).toBe(200);

    const types = result.json.events.map((event) => event.event_type);
    expect(types).toEqual(["created", "price_changed"]);
    expect(result.json.events[1]).toMatchObject({ new_price: 15, old_price: 10 });

    // Three months at the old price, plus today's payment at the new one.
    expect(result.json.totals.estimated_payments).toBe(4);
    expect(result.json.totals.estimated_total).toBe(45);

    const timeline = result.json.timeline;
    expect(timeline).toHaveLength(2);
    expect(timeline[1].price).toBe(15);
  });

  it("logs cycle, currency and status changes, and drops the log with the subscription", async () => {
    const cycles = await harness.listRecords<CycleRecord>("cycles");
    const monthly = cycles.items.find((cycle) => cycle.name === "Monthly")!;
    const yearly = cycles.items.find((cycle) => cycle.name === "Yearly")!;
    const currencies = await harness.listRecords<CurrencyRecord>("currencies");
    const usd = currencies.items.find((currency) => currency.code === "USD")!;
    const eur = currencies.items.find((currency) => currency.code === "EUR")!;

    const sub = await harness.createRecord<SubscriptionRecord>("subscriptions", {
      name: "Cloud",
      price: 5,
      frequency: 1,
      cycle: monthly.id,
      currency: usd.id,
      start_date: isoMonthsAgo(1),
      next_payment: isoDaysAgo(0),
      inactive: false,
      user: harness.admin!.record.id,
    });

    await harness.jsonRequest(`/api/collections/subscriptions/records/${sub.id}`, {
      body: { cycle: yearly.id, currency: eur.id, inactive: true },
      method: "PATCH",
      token: harness.admin!.token,
    });

    const afterChange = await history(sub.id);
    expect(afterChange.json.events.map((event) => event.event_type)).toEqual([
      "created",
      "cycle_changed",
      "currency_changed",
      "paused",
    ]);

    await harness.jsonRequest(`/api/collections/subscriptions/records/${sub.id}`, {
      body: { inactive: false },
      method: "PATCH",
      token: harness.admin!.token,
    });

    const afterResume = await history(sub.id);
    expect(afterResume.json.events.map((event) => event.event_type)).toContain("resumed");

    // The log is readable by its owner and never writable through the API.
    const owned = await harness.listRecords<{ id: string }>("subscription_history");
    expect(owned.items.length).toBe(afterResume.json.events.length);

    const forged = await harness.jsonRequest(
      "/api/collections/subscription_history/records",
      {
        body: {
          effective_date: "2020-01-01",
          event_type: "price_changed",
          new_price: 1,
          subscription_id: sub.id,
          user: harness.admin!.record.id,
        },
        method: "POST",
        token: harness.admin!.token,
      },
    );
    expect(forged.response.status).toBe(403);

    const deleted = await harness.jsonRequest(
      `/api/collections/subscriptions/records/${sub.id}`,
      { method: "DELETE", token: harness.admin!.token },
    );
    expect(deleted.response.status).toBe(204);

    const remaining = await harness.listRecords<{ id: string }>("subscription_history");
    expect(remaining.items).toHaveLength(0);
  });

  it("stops charging a subscription from the day it is paused", async () => {
    const cycle = await monthlyCycle();
    const currency = await usdCurrency();

    const sub = await harness.createRecord<SubscriptionRecord>("subscriptions", {
      name: "Paused",
      price: 10,
      frequency: 1,
      cycle: cycle.id,
      currency: currency.id,
      start_date: isoMonthsAgo(6),
      next_payment: isoDaysAgo(0),
      inactive: false,
      user: harness.admin!.record.id,
    });

    const before = await history(sub.id);
    expect(before.json.totals.estimated_payments).toBe(7);

    await harness.jsonRequest(`/api/collections/subscriptions/records/${sub.id}`, {
      body: { inactive: true },
      method: "PATCH",
      token: harness.admin!.token,
    });

    // The pause takes effect today, so today's occurrence is no longer billed.
    const after = await history(sub.id);
    expect(after.json.totals.estimated_payments).toBe(6);
    expect(after.json.totals.estimated_total).toBe(60);
  });

  it("counts confirmed payments separately from the estimate", async () => {
    const cycle = await monthlyCycle();
    const currency = await usdCurrency();
    const dueDate = isoMonthsAgo(1);

    const sub = await harness.createRecord<SubscriptionRecord>("subscriptions", {
      name: "Gym",
      price: 20,
      frequency: 1,
      cycle: cycle.id,
      currency: currency.id,
      start_date: isoMonthsAgo(2),
      next_payment: isoDaysAgo(0),
      inactive: false,
      user: harness.admin!.record.id,
    });

    await harness.createRecord("payment_records", {
      amount: 20,
      due_date: dueDate,
      paid_at: `${dueDate}T10:00:00.000Z`,
      subscription_id: sub.id,
      user: harness.admin!.record.id,
    });
    // An amount-less record falls back to the price the timeline reports.
    await harness.createRecord("payment_records", {
      due_date: isoMonthsAgo(2),
      paid_at: `${isoMonthsAgo(2)}T10:00:00.000Z`,
      subscription_id: sub.id,
      user: harness.admin!.record.id,
    });

    const result = await history(sub.id);
    expect(result.json.totals.paid_payments).toBe(2);
    expect(result.json.totals.paid_total).toBe(40);
    expect(result.json.totals.estimated_payments).toBe(3);
    expect(result.json.totals.estimated_total).toBe(60);
  });

  it("rejects requests without an id, for unknown ids, and across users", async () => {
    const cycle = await monthlyCycle();
    const sub = await harness.createRecord<SubscriptionRecord>("subscriptions", {
      name: "Private",
      price: 1,
      frequency: 1,
      cycle: cycle.id,
      next_payment: isoDaysAgo(0),
      inactive: false,
      user: harness.admin!.record.id,
    });

    const missing = await harness.jsonRequest<HistoryResponse>(
      "/api/subscription/history",
      { token: harness.admin!.token },
    );
    expect(missing.response.status).toBe(400);

    const unknown = await history("does-not-exist");
    expect(unknown.response.status).toBe(404);

    const anonymous = await harness.jsonRequest<HistoryResponse>(
      `/api/subscription/history?id=${sub.id}`,
    );
    expect(anonymous.response.status).toBe(403);

    const other = await harness.registerAndLoginUser({
      email: "history-other@zublo.test",
      name: "Other User",
      username: "history-other",
    });
    const foreign = await history(sub.id, other.token);
    expect(foreign.response.status).toBe(403);
  });
});
