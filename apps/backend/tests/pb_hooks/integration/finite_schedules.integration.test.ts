import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createHash, randomBytes } from "node:crypto";

import {
  hasPocketBaseBinary,
  PocketBaseIntegrationHarness,
} from "./setup.integration";

interface CycleRecord {
  id: string;
  name: string;
}

interface CurrencyRecord {
  id: string;
  symbol: string;
}

interface SubscriptionRecord {
  id: string;
  end_date: string;
  inactive: boolean;
  name: string;
  next_payment: string;
  payment_limit: number;
  payments_completed: number;
  record_type?: "" | "expense" | "credit";
}

interface PaymentRecord {
  amount: number;
  auto_paid: boolean;
  due_date: string;
  id: string;
  subscription_id: string;
  user: string;
}

/**
 * Live coverage for finite schedules, against a real PocketBase.
 *
 * The filter behaviour below is the whole reason these tests exist: an unset
 * PocketBase date field is stored as the empty string and date filters are
 * string comparisons, so `end_date < :today` silently matches every record
 * that has no end date. That is invisible to unit tests and to static source
 * checks — only a real query proves which rows come back.
 */
describe
  .skipIf(!hasPocketBaseBinary)
  .sequential("pb_hooks finite subscription schedules", () => {
    const harness = new PocketBaseIntegrationHarness();

    beforeEach(async () => {
      await harness.reset();
    });

    afterAll(async () => {
      await harness.stop();
    });

    it("only matches rows with a real end date once the filter is guarded", async () => {
      const { currency, monthlyCycle, userId } = await seedBasics(harness);
      const today = formatDate(new Date());

      // No end date at all — the empty string that used to poison the filter.
      await harness.createRecord<SubscriptionRecord>("subscriptions", {
        ...subscriptionDefaults(currency.id, monthlyCycle.id, userId),
        name: "Unbounded",
        next_payment: addDays(today, 30),
      });

      // An end date that has already passed.
      await harness.createRecord<SubscriptionRecord>("subscriptions", {
        ...subscriptionDefaults(currency.id, monthlyCycle.id, userId),
        name: "Expired",
        next_payment: addDays(today, 30),
        end_date: addDays(today, -5),
      });

      // Confirms the hazard is real rather than theoretical: without the guard
      // the unbounded row comes back too.
      const unguarded = await harness.listRecords<SubscriptionRecord>(
        "subscriptions",
        {
          filter: `end_date < "${today}"`,
        },
      );
      expect(unguarded.items.map((item) => item.name).sort()).toEqual([
        "Expired",
        "Unbounded",
      ]);

      // The guard the cron hooks actually use.
      const guarded = await harness.listRecords<SubscriptionRecord>(
        "subscriptions",
        {
          filter: `end_date != "" && end_date < "${today}"`,
        },
      );
      expect(guarded.items.map((item) => item.name)).toEqual(["Expired"]);
    });

    it("stores an unset date field as the empty string", async () => {
      const { currency, monthlyCycle, userId } = await seedBasics(harness);

      const created = await harness.createRecord<SubscriptionRecord>(
        "subscriptions",
        {
          ...subscriptionDefaults(currency.id, monthlyCycle.id, userId),
          name: "No end date",
          next_payment: formatDate(new Date()),
        },
      );

      expect(created.end_date).toBe("");
      expect(created.payment_limit).toBe(0);
      expect(created.payments_completed).toBe(0);
    });

    it("renew completes a count-bounded schedule without advancing past its final payment", async () => {
      const { currency, monthlyCycle, userId } = await seedBasics(harness);
      const token = harness.admin!.token;
      const today = formatDate(new Date());

      const subscription = await harness.createRecord<SubscriptionRecord>(
        "subscriptions",
        {
          ...subscriptionDefaults(currency.id, monthlyCycle.id, userId),
          name: "Installments",
          next_payment: addDays(today, -1),
          auto_renew: true,
          payment_limit: 3,
          payments_completed: 2,
        },
      );

      const renewed = await harness.jsonRequest<{
        inactive: boolean;
        next_payment: string;
        payments_completed: number;
      }>("/api/subscription/renew", {
        method: "POST",
        body: { id: subscription.id },
        token,
      });

      expect(renewed.response.ok).toBe(true);
      // The final payment was consumed, so the schedule ends here and parks on
      // the date that closed it rather than rolling into a fourth installment.
      expect(renewed.json.payments_completed).toBe(3);
      expect(renewed.json.inactive).toBe(true);
      expect(renewed.json.next_payment.slice(0, 10)).toBe(addDays(today, -1));
    });

    it("renew leaves a manually paused subscription untouched", async () => {
      const { currency, monthlyCycle, userId } = await seedBasics(harness);
      const token = harness.admin!.token;
      const today = formatDate(new Date());
      const duePayment = addDays(today, -1);

      const subscription = await harness.createRecord<SubscriptionRecord>(
        "subscriptions",
        {
          ...subscriptionDefaults(currency.id, monthlyCycle.id, userId),
          name: "Paused",
          next_payment: duePayment,
          auto_renew: true,
          inactive: true,
        },
      );

      const renewed = await harness.jsonRequest<{
        inactive: boolean;
        next_payment: string;
      }>("/api/subscription/renew", {
        method: "POST",
        body: { id: subscription.id },
        token,
      });

      expect(renewed.response.ok).toBe(true);
      // Renewing must never be a way to silently un-pause a subscription.
      expect(renewed.json.inactive).toBe(true);
      expect(renewed.json.next_payment.slice(0, 10)).toBe(duePayment);
    });

    it("check_subscriptions advances due schedules and respects their bounds", async () => {
      const { currency, monthlyCycle, userId } = await seedBasics(harness);
      const token = harness.admin!.token;
      const today = formatDate(new Date());
      const defaults = subscriptionDefaults(
        currency.id,
        monthlyCycle.id,
        userId,
      );

      // Proves the shared module resolves and runs inside a real hook callback,
      // which no unit test can show: `require(__hooks + ...)` only resolves on the
      // pooled JSVM runtime that actually serves the request.
      const unbounded = await harness.createRecord<SubscriptionRecord>(
        "subscriptions",
        {
          ...defaults,
          name: "Unbounded due",
          auto_renew: true,
          next_payment: addDays(today, -1),
        },
      );

      const finishing = await harness.createRecord<SubscriptionRecord>(
        "subscriptions",
        {
          ...defaults,
          name: "Final installment",
          auto_renew: true,
          next_payment: addDays(today, -1),
          payment_limit: 3,
          payments_completed: 2,
        },
      );

      // Not due, and no end date — must not be touched at all. This is the row
      // the unguarded `end_date < :today` filter used to drag in every night.
      const future = await harness.createRecord<SubscriptionRecord>(
        "subscriptions",
        {
          ...defaults,
          name: "Not due",
          auto_renew: true,
          next_payment: addDays(today, 30),
        },
      );

      const run = await harness.jsonRequest<{ message: string }>(
        "/api/cron/check_subscriptions",
        {
          method: "POST",
          token,
        },
      );
      expect(run.response.ok).toBe(true);
      expect(run.json.message).toContain("processed 2 subscription(s)");

      const after = await harness.listRecords<SubscriptionRecord>(
        "subscriptions",
        {},
      );
      const byId = new Map(after.items.map((item) => [item.id, item]));

      // Unbounded: advanced past today, still active.
      expect(byId.get(unbounded.id)!.next_payment.slice(0, 10)).not.toBe(
        addDays(today, -1),
      );
      expect(byId.get(unbounded.id)!.inactive).toBe(false);

      // Count-bounded: consumed its last payment, parked on that date, deactivated.
      expect(byId.get(finishing.id)!.payments_completed).toBe(3);
      expect(byId.get(finishing.id)!.inactive).toBe(true);
      expect(byId.get(finishing.id)!.next_payment.slice(0, 10)).toBe(
        addDays(today, -1),
      );

      // Untouched.
      expect(byId.get(future.id)!.next_payment.slice(0, 10)).toBe(
        addDays(today, 30),
      );
      expect(byId.get(future.id)!.inactive).toBe(false);
    });

    it("records the final automatic payment before schedule advancement deactivates it", async () => {
      const { currency, monthlyCycle, userId } = await seedBasics(harness);
      const cycles = await harness.listRecords<CycleRecord>("cycles");
      const oneTimeCycle = cycles.items.find(
        (cycle) => cycle.name === "One-Time",
      )!;
      const token = harness.admin!.token;
      const today = formatDate(new Date());

      const paymentTracking = await harness.jsonRequest(
        `/api/collections/users/records/${userId}`,
        {
          method: "PATCH",
          body: { payment_tracking: true },
          token,
        },
      );
      expect(paymentTracking.response.ok).toBe(true);

      const subscription = await harness.createRecord<SubscriptionRecord>(
        "subscriptions",
        {
          ...subscriptionDefaults(currency.id, monthlyCycle.id, userId),
          name: "Last auto-paid installment",
          next_payment: today,
          auto_mark_paid: true,
          auto_renew: true,
          payment_limit: 1,
          payments_completed: 0,
        },
      );

      // Even if stale data carries finite/automatic flags, income is never a
      // schedule and must be ignored by both advancement and auto-mark-paid.
      const credit = await harness.createRecord<SubscriptionRecord>(
        "subscriptions",
        {
          ...subscriptionDefaults(currency.id, oneTimeCycle.id, userId),
          name: "Bonus",
          record_type: "credit",
          next_payment: today,
          auto_mark_paid: true,
          auto_renew: true,
          payment_limit: 1,
          payments_completed: 0,
        },
      );

      // Reproduce the problematic order: schedule advancement runs first at
      // midnight and consumes the final installment, making the row inactive.
      const advancement = await harness.jsonRequest<{ message: string }>(
        "/api/cron/check_subscriptions",
        { method: "POST", token },
      );
      expect(advancement.response.ok).toBe(true);
      expect(advancement.json.message).toContain("processed 1 subscription(s)");

      const afterAdvance = await harness.listRecords<SubscriptionRecord>(
        "subscriptions",
        {
          filter: `id = "${subscription.id}"`,
        },
      );
      expect(afterAdvance.items[0]).toMatchObject({
        inactive: true,
        payment_limit: 1,
        payments_completed: 1,
      });

      const creditAfterAdvance = await harness.listRecords<SubscriptionRecord>(
        "subscriptions",
        {
          filter: `id = "${credit.id}"`,
        },
      );
      expect(creditAfterAdvance.items[0]).toMatchObject({
        inactive: false,
        next_payment: expect.stringContaining(today),
        payment_limit: 1,
        payments_completed: 0,
        record_type: "credit",
      });

      const paymentsAfterAdvance = await harness.listRecords<PaymentRecord>(
        "payment_records",
        {},
      );
      expect(paymentsAfterAdvance.items).toHaveLength(1);
      expect(paymentsAfterAdvance.items[0]).toMatchObject({
        amount: 10,
        auto_paid: true,
        due_date: today,
        subscription_id: subscription.id,
        user: userId,
      });

      // Then the dedicated autoMarkPaid cron fires. Its shared due-date check
      // must neither miss the final payment nor write the same occurrence twice.
      const autoMark = await harness.jsonRequest<{ message: string }>(
        "/api/cron/auto_mark_paid",
        { method: "POST", token },
      );
      expect(autoMark.response.ok).toBe(true);
      expect(autoMark.json.message).toContain("created 0 payment record(s)");

      const paymentsAfterBothJobs = await harness.listRecords<PaymentRecord>(
        "payment_records",
        {},
      );
      expect(paymentsAfterBothJobs.items).toHaveLength(1);
      expect(paymentsAfterBothJobs.items[0].id).toBe(
        paymentsAfterAdvance.items[0].id,
      );
    });

    it("batch reports per-item failures without rolling back what it already wrote", async () => {
      const { currency, monthlyCycle, userId } = await seedBasics(harness);
      const apiKey = await seedApiKey(harness, ["subscriptions:write"]);
      const today = formatDate(new Date());

      const before = await harness.listRecords<SubscriptionRecord>(
        "subscriptions",
        {},
      );
      expect(before.items).toHaveLength(0);

      const batch = await harness.jsonRequest<{
        created: Array<{ id: string; name: string }>;
        errors: Array<{ index: number; name: string; reason: string }>;
        success: boolean;
      }>("/api/external/subscriptions/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: {
          items: [
            {
              name: "Good",
              price: 10,
              currency_id: currency.id,
              cycle_id: monthlyCycle.id,
              next_payment: today,
              payment_limit: 6,
            },
            {
              name: "Both bounds",
              price: 10,
              currency_id: currency.id,
              cycle_id: monthlyCycle.id,
              next_payment: today,
              end_date: addDays(today, 90),
              payment_limit: 6,
            },
            {
              name: "Missing cycle",
              price: 10,
              currency_id: currency.id,
              next_payment: today,
            },
          ],
        },
      });

      // 200, not 4xx: the first item is already committed, so a status that reads
      // as "nothing was written" would invite a retry that duplicates it.
      expect(batch.response.status).toBe(200);
      expect(batch.json.success).toBe(false);
      expect(batch.json.created.map((item) => item.name)).toEqual(["Good"]);
      expect(batch.json.errors.map((item) => item.name)).toEqual([
        "Both bounds",
        "Missing cycle",
      ]);

      // The valid item really is persisted, and the rejected ones left nothing
      // behind — no half-built record pointing at a cycle that does not exist.
      const after = await harness.listRecords<SubscriptionRecord>(
        "subscriptions",
        {},
      );
      expect(after.items.map((item) => item.name)).toEqual(["Good"]);
      expect(after.items[0].payment_limit).toBe(6);
      expect(userId).toBe(harness.admin!.record.id);
    });

    it("batch reports a rejected save instead of answering 500", async () => {
      const { currency, monthlyCycle } = await seedBasics(harness);
      const apiKey = await seedApiKey(harness, ["subscriptions:write"]);
      const today = formatDate(new Date());

      const batch = await harness.jsonRequest<{
        created: Array<{ name: string }>;
        errors: Array<{ name: string; reason: string }>;
        success: boolean;
      }>("/api/external/subscriptions/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: {
          items: [
            {
              name: "Priced",
              price: 10,
              currency_id: currency.id,
              cycle_id: monthlyCycle.id,
              next_payment: today,
            },
            // price is required in the schema and PocketBase counts 0 as blank, so
            // this save throws. Before it was caught per item, one such row made
            // the whole endpoint answer 500 and discard the response body — while
            // the row above stayed committed and invisible to the caller.
            {
              name: "No price",
              currency_id: currency.id,
              cycle_id: monthlyCycle.id,
              next_payment: today,
            },
          ],
        },
      });

      expect(batch.response.status).toBe(200);
      expect(batch.json.success).toBe(false);
      expect(batch.json.created.map((item) => item.name)).toEqual(["Priced"]);
      expect(batch.json.errors.map((item) => item.name)).toEqual(["No price"]);
      expect(batch.json.errors[0].reason).toContain("price");

      const after = await harness.listRecords<SubscriptionRecord>(
        "subscriptions",
        {},
      );
      expect(after.items.map((item) => item.name)).toEqual(["Priced"]);
    });

    it("batch returns success with no errors when every item is valid", async () => {
      const { currency, monthlyCycle } = await seedBasics(harness);
      const apiKey = await seedApiKey(harness, ["subscriptions:write"]);
      const today = formatDate(new Date());

      const batch = await harness.jsonRequest<{
        created: Array<{ id: string }>;
        errors: unknown[];
        success: boolean;
      }>("/api/external/subscriptions/batch", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: {
          items: [
            {
              name: "Only good",
              price: 10,
              currency_id: currency.id,
              cycle_id: monthlyCycle.id,
              next_payment: today,
            },
          ],
        },
      });

      expect(batch.response.status).toBe(200);
      expect(batch.json.success).toBe(true);
      expect(batch.json.errors).toEqual([]);
      expect(batch.json.created).toHaveLength(1);
    });

    it("clone resets schedule progress instead of copying a spent plan", async () => {
      const { currency, monthlyCycle, userId } = await seedBasics(harness);
      const token = harness.admin!.token;

      const original = await harness.createRecord<SubscriptionRecord>(
        "subscriptions",
        {
          ...subscriptionDefaults(currency.id, monthlyCycle.id, userId),
          name: "Finished plan",
          next_payment: formatDate(new Date()),
          auto_renew: true,
          inactive: true,
          payment_limit: 6,
          payments_completed: 6,
        },
      );

      const cloned = await harness.jsonRequest<{ id: string }>(
        "/api/subscription/clone",
        {
          method: "POST",
          body: { id: original.id },
          token,
        },
      );
      expect(cloned.response.ok).toBe(true);

      const clones = await harness.listRecords<SubscriptionRecord>(
        "subscriptions",
        {
          filter: `id = "${cloned.json.id}"`,
        },
      );
      const clone = clones.items[0];

      // The structural bound is worth keeping; the spent progress is not.
      expect(clone.payment_limit).toBe(6);
      expect(clone.payments_completed).toBe(0);
      expect(clone.inactive).toBe(false);
    });
  });

async function seedApiKey(
  harness: PocketBaseIntegrationHarness,
  permissions: string[],
): Promise<string> {
  const rawKey = "wk_integration_" + randomBytes(8).toString("hex");
  // api_keys has no collection rules, so only a superuser may write to it.
  await harness.createRecord(
    "api_keys",
    {
      key_hash: createHash("sha256").update(rawKey).digest("hex"),
      key_prefix: rawKey.slice(0, 10),
      name: "integration",
      permissions: JSON.stringify(permissions),
      user: harness.admin!.record.id,
    },
    harness.superuser!.token,
  );
  return rawKey;
}

async function seedBasics(harness: PocketBaseIntegrationHarness): Promise<{
  currency: CurrencyRecord;
  monthlyCycle: CycleRecord;
  userId: string;
}> {
  const userId = harness.admin!.record.id;
  const token = harness.admin!.token;

  const cycles = await harness.listRecords<CycleRecord>("cycles", { token });
  const monthlyCycle = cycles.items.find((cycle) => cycle.name === "Monthly");
  if (!monthlyCycle) {
    throw new Error("The seed migration did not create the Monthly cycle.");
  }

  const currency = await harness.createRecord<CurrencyRecord>("currencies", {
    code: "USD",
    is_main: true,
    name: "US Dollar",
    rate: 1,
    symbol: "$",
    user: userId,
  });

  return { currency, monthlyCycle, userId };
}

function subscriptionDefaults(
  currencyId: string,
  cycleId: string,
  userId: string,
): Record<string, unknown> {
  return {
    auto_renew: false,
    currency: currencyId,
    cycle: cycleId,
    frequency: 1,
    inactive: false,
    notify: false,
    price: 10,
    user: userId,
  };
}

function formatDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const result = new Date(year, month - 1, day);
  result.setDate(result.getDate() + days);
  return formatDate(result);
}
