import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  hasPocketBaseBinary,
  PocketBaseIntegrationHarness,
} from "./setup.integration";

interface CycleRecord {
  id: string;
  name: string;
}

interface SubscriptionRecord {
  end_date?: string;
  id: string;
  name: string;
  payment_limit?: number;
  payments_completed?: number;
  record_type?: "" | "expense" | "credit";
}

describe.skipIf(!hasPocketBaseBinary).sequential("income credits", () => {
  const harness = new PocketBaseIntegrationHarness();

  beforeEach(async () => {
    await harness.reset();
  });

  afterAll(async () => {
    await harness.stop();
  });

  it("migrates the one-time cycle and excludes credits from cost snapshots", async () => {
    const cycles = await harness.listRecords<CycleRecord>("cycles");
    const oneTime = cycles.items.find((cycle) => cycle.name === "One-Time");
    expect(oneTime).toBeDefined();

    const userId = harness.admin!.record.id;
    const legacyExpense = await harness.createRecord<SubscriptionRecord>(
      "subscriptions",
      {
        name: "Legacy expense",
        price: 100,
        frequency: 1,
        next_payment: "2026-08-10",
        inactive: false,
        user: userId,
      },
    );
    expect(legacyExpense.record_type ?? "").toBe("");

    const credit = await harness.createRecord<SubscriptionRecord>(
      "subscriptions",
      {
        name: "Performance bonus",
        record_type: "credit",
        price: 500,
        frequency: 1,
        cycle: oneTime!.id,
        next_payment: "2026-08-15",
        inactive: false,
        auto_renew: false,
        notify: false,
        user: userId,
      },
    );

    const snapshot = await harness.jsonRequest<{
      month: number;
      total: number;
      year: number;
    }>("/api/costs/snapshot", {
      method: "POST",
      token: harness.admin!.token,
    });

    expect(snapshot.response.status, JSON.stringify(snapshot.json)).toBe(200);
    expect(snapshot.json.total).toBe(100);

    const renewal = await harness.jsonRequest<{ error: string }>(
      "/api/subscription/renew",
      {
        body: { id: credit.id },
        method: "POST",
        token: harness.admin!.token,
      },
    );
    expect(renewal.response.status).toBe(400);
    expect(renewal.json.error).toBe("Credits cannot be renewed");

    const exported = await harness.jsonRequest<{
      subscriptions: Array<{ name: string; record_type: string }>;
    }>("/api/subscriptions/export", {
      token: harness.admin!.token,
    });
    expect(exported.response.status).toBe(200);
    expect(exported.json.subscriptions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Legacy expense",
          record_type: "expense",
        }),
        expect.objectContaining({
          name: "Performance bonus",
          record_type: "credit",
        }),
      ]),
    );

    const apiKey = await harness.jsonRequest<{ key: string }>("/api/api-keys", {
      body: {
        name: "Income integration",
        permissions: ["subscriptions:read", "statistics:read"],
      },
      method: "POST",
      token: harness.admin!.token,
    });
    expect(apiKey.response.status, JSON.stringify(apiKey.json)).toBe(200);

    const externalSubscriptions = await harness.jsonRequest<{
      items: Array<{ name: string; record_type: string }>;
    }>("/api/external/subscriptions", {
      headers: { Authorization: `Bearer ${apiKey.json.key}` },
    });
    expect(externalSubscriptions.response.status).toBe(200);
    expect(externalSubscriptions.json.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Legacy expense",
          record_type: "expense",
        }),
        expect.objectContaining({
          name: "Performance bonus",
          record_type: "credit",
        }),
      ]),
    );

    const externalStatistics = await harness.jsonRequest<{
      active_count: number;
      breakdown: Array<{ name: string }>;
      total_monthly: number;
      total_yearly: number;
    }>("/api/external/statistics", {
      headers: { Authorization: `Bearer ${apiKey.json.key}` },
    });
    expect(externalStatistics.response.status).toBe(200);
    // active_count counts what the totals count: credits are income, not
    // subscriptions, so they appear in neither.
    expect(externalStatistics.json).toMatchObject({
      active_count: 1,
      total_monthly: 100,
      total_yearly: 1200,
    });
    expect(externalStatistics.json.breakdown).toEqual([
      expect.objectContaining({ name: "Legacy expense" }),
    ]);
  });

  it("keeps record_type and cycle paired on the external write endpoints", async () => {
    const cycles = await harness.listRecords<CycleRecord>("cycles");
    const oneTime = cycles.items.find((cycle) => cycle.name === "One-Time")!;
    const monthly = cycles.items.find((cycle) => cycle.name === "Monthly")!;
    const currencies = await harness.listRecords<{ id: string }>("currencies");
    const currencyId = currencies.items[0]!.id;

    const apiKey = await harness.jsonRequest<{ key: string }>("/api/api-keys", {
      body: {
        name: "Pairing",
        permissions: ["subscriptions:read", "subscriptions:write"],
      },
      method: "POST",
      token: harness.admin!.token,
    });
    const auth = { Authorization: `Bearer ${apiKey.json.key}` };

    // A credit asked for a recurring cycle is repaired onto One-Time. Left
    // recurring, the updateNextPayment cron would never advance it and it
    // would silently stop counting once its month passed.
    const credit = await harness.jsonRequest<{ id: string }>(
      "/api/external/subscriptions",
      {
        body: {
          name: "Monthly bonus",
          record_type: "credit",
          price: 500,
          currency_id: currencyId,
          cycle_id: monthly.id,
          next_payment: "2026-08-15",
        },
        headers: auth,
        method: "POST",
      },
    );
    expect(credit.response.status).toBe(200);

    const stored = await harness.jsonRequest<{
      cycle_id: string;
      frequency: number;
    }>(`/api/external/subscriptions/${credit.json.id}`, { headers: auth });
    expect(stored.json.cycle_id).toBe(oneTime.id);
    expect(stored.json.frequency).toBe(1);

    // A One-Time expense has no recurring monthly equivalent, so it is
    // rejected rather than silently billed every month forever.
    const oneTimeExpense = await harness.jsonRequest<{ error: string }>(
      "/api/external/subscriptions",
      {
        body: {
          name: "Laptop",
          record_type: "expense",
          price: 2000,
          currency_id: currencyId,
          cycle_id: oneTime.id,
          next_payment: "2026-08-15",
        },
        headers: auth,
        method: "POST",
      },
    );
    expect(oneTimeExpense.response.status).toBe(400);
    expect(oneTimeExpense.json.error).toBe(
      "The One-Time cycle is reserved for credits",
    );

    // Converting the repaired credit back to an expense cannot leave it on
    // the One-Time cycle either.
    const convert = await harness.jsonRequest<{ error: string }>(
      `/api/external/subscriptions/${credit.json.id}`,
      { body: { record_type: "expense" }, headers: auth, method: "PUT" },
    );
    expect(convert.response.status).toBe(400);
    expect(convert.json.error).toBe(
      "The One-Time cycle is reserved for credits",
    );
  });

  it("reports every batch result after partial writes", async () => {
    const cycles = await harness.listRecords<CycleRecord>("cycles");
    const oneTime = cycles.items.find((cycle) => cycle.name === "One-Time")!;
    const monthly = cycles.items.find((cycle) => cycle.name === "Monthly")!;
    const currencies = await harness.listRecords<{ id: string }>("currencies");
    const currencyId = currencies.items[0]!.id;

    const apiKey = await harness.jsonRequest<{ key: string }>("/api/api-keys", {
      body: { name: "Batch outcomes", permissions: ["subscriptions:write"] },
      method: "POST",
      token: harness.admin!.token,
    });

    const batch = await harness.jsonRequest<{
      created: Array<{ id: string; name: string }>;
      errors: Array<{ index: number; name: string; reason: string }>;
      success: boolean;
    }>("/api/external/subscriptions/batch", {
      body: {
        items: [
          {
            name: "Valid bonus",
            record_type: "credit",
            price: 500,
            currency_id: currencyId,
            cycle_id: monthly.id,
            next_payment: "2026-08-15",
            end_date: "2026-12-15",
            payment_limit: 12,
            payments_completed: 3,
          },
          {
            name: "Invalid one-time expense",
            record_type: "expense",
            price: 2000,
            currency_id: currencyId,
            cycle_id: oneTime.id,
            next_payment: "2026-08-15",
          },
          {
            name: "Rejected by schema",
            record_type: "expense",
            price: 25,
            currency_id: "missing-currency",
            cycle_id: monthly.id,
            next_payment: "2026-08-15",
          },
        ],
      },
      headers: { Authorization: `Bearer ${apiKey.json.key}` },
      method: "POST",
    });

    expect(batch.response.status, JSON.stringify(batch.json)).toBe(200);
    expect(batch.json.success).toBe(false);
    expect(batch.json.created.map((item) => item.name)).toEqual([
      "Valid bonus",
    ]);
    expect(batch.json.errors).toEqual([
      {
        index: 1,
        name: "Invalid one-time expense",
        reason: "The One-Time cycle is reserved for credits",
      },
      expect.objectContaining({
        index: 2,
        name: "Rejected by schema",
      }),
    ]);

    const records =
      await harness.listRecords<SubscriptionRecord>("subscriptions");
    expect(records.items.map((item) => item.name)).toEqual(["Valid bonus"]);
    expect(records.items[0]).toMatchObject({
      record_type: "credit",
      end_date: "",
      payment_limit: 0,
      payments_completed: 0,
    });
  });

  it("explains that credits are not expense subscriptions for AI analysis", async () => {
    const cycles = await harness.listRecords<CycleRecord>("cycles");
    const oneTime = cycles.items.find((cycle) => cycle.name === "One-Time")!;
    const currencies = await harness.listRecords<{ id: string }>("currencies");

    await harness.createRecord(
      "ai_settings",
      {
        api_key: "unused",
        enabled: true,
        model: "unused",
        name: "Income test",
        type: "custom",
        url: "http://127.0.0.1:1",
        user: harness.admin!.record.id,
      },
      harness.superuser!.token,
    );
    await harness.createRecord("subscriptions", {
      name: "Only bonus",
      record_type: "credit",
      price: 750,
      currency: currencies.items[0]!.id,
      frequency: 1,
      cycle: oneTime.id,
      next_payment: "2026-08-15",
      inactive: false,
      user: harness.admin!.record.id,
    });

    const result = await harness.jsonRequest<{ error: string }>(
      "/api/ai/generate",
      {
        body: {},
        method: "POST",
        token: harness.admin!.token,
      },
    );

    expect(result.response.status).toBe(400);
    expect(result.json.error).toBe("No active expense subscriptions found");
  });
});
