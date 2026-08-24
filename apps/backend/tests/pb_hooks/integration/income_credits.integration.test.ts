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
  id: string;
  name: string;
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
    expect(renewal.json.error).toBe("One-time credits cannot be renewed");

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
    expect(externalStatistics.json).toMatchObject({
      active_count: 2,
      total_monthly: 100,
      total_yearly: 1200,
    });
    expect(externalStatistics.json.breakdown).toEqual([
      expect.objectContaining({ name: "Legacy expense" }),
    ]);
  });
});
