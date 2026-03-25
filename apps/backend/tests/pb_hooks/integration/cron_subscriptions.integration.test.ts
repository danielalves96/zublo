import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import net from "node:net";

import { PocketBaseIntegrationHarness } from "./setup.integration";

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
  name: string;
}

interface NotificationLogRecord {
  id: string;
  reminder_key: string;
  sent_date: string;
  subscription_id: string;
  user_id: string;
}

interface WebhookPayload {
  message: string;
  subscriptions: Array<{ id: string; name: string }>;
  title: string;
}

describe.sequential("pb_hooks/cron_subscriptions.pb.js deduplication", () => {
  const harness = new PocketBaseIntegrationHarness();

  beforeEach(async () => {
    await harness.reset();
  });

  afterAll(async () => {
    await harness.stop();
  });

  it("creates a notification_log entry on the first run and suppresses duplicate notifications on the second run", async () => {
    const webhookEvents: WebhookPayload[] = [];
    const webhook = await startWebhookServer((payload) => {
      webhookEvents.push(payload);
    });

    try {
      const { reminderKey, subscription, today } = await seedNotificationScenario({
        harness,
        webhookUrl: webhook.baseUrl,
      });

      const adminCheck = await harness.jsonRequest<{ isAdmin: boolean }>("/api/auth/is-admin", {
        method: "GET",
        token: harness.admin!.token,
      });
      expect(adminCheck.response.status, JSON.stringify(adminCheck.json)).toBe(200);
      expect(adminCheck.json.isAdmin).toBe(true);

      const firstRun = await harness.jsonRequest<{ message: string }>("/api/cron/send_notifications", {
        method: "POST",
        token: harness.admin!.token,
      });

      expect(
        firstRun.response.status,
        JSON.stringify({ body: firstRun.json, logs: extractRelevantLogs(harness.dumpLogs()) }),
      ).toBe(200);
      expect(firstRun.json.message).toContain("dispatched 1 notification(s)");
      expect(webhookEvents).toHaveLength(1);
      expect(webhookEvents[0].title).toContain("Upcoming Payments");
      expect(webhookEvents[0].message).toContain("Netflix");
      expect(webhookEvents[0].subscriptions).toHaveLength(1);
      expect(webhookEvents[0].subscriptions[0]).toMatchObject({
        id: subscription.id,
        name: "Netflix",
      });

      const logsAfterFirstRun = await harness.listRecords<NotificationLogRecord>("notification_log");
      expect(logsAfterFirstRun.items).toHaveLength(1);
      expect(logsAfterFirstRun.items[0]).toMatchObject({
        reminder_key: reminderKey,
        sent_date: today,
        subscription_id: subscription.id,
        user_id: harness.admin!.record.id,
      });

      const secondRun = await harness.jsonRequest<{ message: string }>("/api/cron/send_notifications", {
        method: "POST",
        token: harness.admin!.token,
      });

      expect(secondRun.response.status).toBe(200);
      expect(secondRun.json.message).toContain("dispatched 0 notification(s)");
      expect(webhookEvents).toHaveLength(1);

      const logsAfterSecondRun = await harness.listRecords<NotificationLogRecord>("notification_log");
      expect(logsAfterSecondRun.items).toHaveLength(1);
      expect(logsAfterSecondRun.items[0].id).toBe(logsAfterFirstRun.items[0].id);
    } finally {
      await webhook.close();
    }
  });

  it("skips sending immediately when a matching notification_log row already exists for the same day and reminder slot", async () => {
    const webhookEvents: WebhookPayload[] = [];
    const webhook = await startWebhookServer((payload) => {
      webhookEvents.push(payload);
    });

    try {
      const { reminderKey, subscription, today } = await seedNotificationScenario({
        harness,
        webhookUrl: webhook.baseUrl,
      });

      const adminCheck = await harness.jsonRequest<{ isAdmin: boolean }>("/api/auth/is-admin", {
        method: "GET",
        token: harness.admin!.token,
      });
      expect(adminCheck.response.status, JSON.stringify(adminCheck.json)).toBe(200);
      expect(adminCheck.json.isAdmin).toBe(true);

      await harness.createRecord<NotificationLogRecord>("notification_log", {
        reminder_key: reminderKey,
        sent_date: today,
        subscription_id: subscription.id,
        user_id: harness.admin!.record.id,
      });

      const response = await harness.jsonRequest<{ message: string }>("/api/cron/send_notifications", {
        method: "POST",
        token: harness.admin!.token,
      });

      expect(
        response.response.status,
        JSON.stringify({ body: response.json, logs: extractRelevantLogs(harness.dumpLogs()) }),
      ).toBe(200);
      expect(response.json.message).toContain("dispatched 0 notification(s)");
      expect(webhookEvents).toHaveLength(0);

      const logs = await harness.listRecords<NotificationLogRecord>("notification_log");
      expect(logs.items).toHaveLength(1);
      expect(logs.items[0]).toMatchObject({
        reminder_key: reminderKey,
        sent_date: today,
        subscription_id: subscription.id,
      });
    } finally {
      await webhook.close();
    }
  });
});

async function seedNotificationScenario(input: {
  harness: PocketBaseIntegrationHarness;
  webhookUrl: string;
}): Promise<{
  reminderKey: string;
  subscription: SubscriptionRecord;
  today: string;
}> {
  const { harness, webhookUrl } = input;
  const userId = harness.admin!.record.id;

  const cycles = await harness.listRecords<CycleRecord>("cycles", { token: harness.admin!.token });
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

  const reminderHour = 8;
  const reminderDays = 3;
  const reminderKey = `${reminderDays}d_${reminderHour}h`;
  const today = formatDate(new Date());
  const nextPayment = addDays(today, reminderDays);

  await harness.createRecord("notifications_config", {
    reminders: [{ days: reminderDays, hour: reminderHour }],
    user: userId,
    webhook_enabled: true,
    webhook_url: webhookUrl,
  });

  const subscription = await harness.createRecord<SubscriptionRecord>("subscriptions", {
    auto_renew: false,
    currency: currency.id,
    cycle: monthlyCycle.id,
    frequency: 1,
    inactive: false,
    name: "Netflix",
    next_payment: nextPayment,
    notify: true,
    price: 19.99,
    user: userId,
  });

  return {
    reminderKey,
    subscription,
    today,
  };
}

async function startWebhookServer(
  onPayload: (payload: WebhookPayload) => void,
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const port = await getFreePort();
  const server = createServer(async (req, res) => {
    const body = await readRequestBody(req);
    onPayload(JSON.parse(body) as WebhookPayload);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => closeServer(server),
  };
}

async function readRequestBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number): string {
  const date = new Date(`${dateString}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDate(date);
}

async function getFreePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Failed to reserve a port for the webhook server."));
        return;
      }

      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(address.port);
      });
    });
  });
}

async function closeServer(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function extractRelevantLogs(logs: string): string[] {
  return logs
    .split("\n")
    .filter((line) => {
      return (
        line.includes("ERROR") ||
        line.includes("RangeError") ||
        line.includes("ReferenceError") ||
        line.includes("TypeError")
      );
    })
    .slice(-20);
}
