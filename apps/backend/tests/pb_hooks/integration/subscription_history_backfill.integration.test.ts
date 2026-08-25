import { copyFileSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

import {
  hasPocketBaseBinary,
  PocketBaseIntegrationHarness,
} from "./setup.integration";

const backendRoot = fileURLToPath(new URL("../../../", import.meta.url));
const realMigrationsDir = join(backendRoot, "pb_migrations");
const HISTORY_MIGRATION = "1787673200_subscription_history.js";

interface HistoryResponse {
  events: Array<{
    effective_date: string;
    event_type: string;
    new_price: number;
    note: string;
  }>;
  totals: { estimated_payments: number; estimated_total: number; since: string };
}

function isoMonthsAgo(months: number): string {
  const date = new Date();
  date.setUTCHours(12, 0, 0, 0);
  date.setUTCMonth(date.getUTCMonth() - months);
  return date.toISOString().slice(0, 10);
}

/**
 * Every existing install reaches this feature through the migration, not
 * through the hooks: their subscriptions were written long before anything
 * logged changes. This boots the schema as it was, writes a subscription into
 * it, and then restarts on the current migrations to check the backfill gives
 * that subscription a timeline.
 */
describe.skipIf(!hasPocketBaseBinary).sequential(
  "subscription history backfill on upgrade",
  () => {
    const harness = new PocketBaseIntegrationHarness();
    const legacyDirs: string[] = [];

    beforeEach(() => {
      const legacyMigrationsDir = mkdtempSync(join(tmpdir(), "zublo-pre-history-migrations-"));
      legacyDirs.push(legacyMigrationsDir);

      for (const entry of readdirSync(realMigrationsDir)) {
        if (!entry.endsWith(".js") || entry === HISTORY_MIGRATION) continue;
        copyFileSync(join(realMigrationsDir, entry), join(legacyMigrationsDir, entry));
      }

      harness.useMigrationsDir(legacyMigrationsDir);
    });

    afterAll(async () => {
      await harness.stop();
      for (const dir of legacyDirs) {
        if (existsSync(dir)) rmSync(dir, { force: true, recursive: true });
      }
    });

    it("gives pre-existing subscriptions a created event dated from their start", async () => {
      await harness.reset();

      const cycles = await harness.listRecords<{ id: string; name: string }>("cycles");
      const monthly = cycles.items.find((cycle) => cycle.name === "Monthly")!;
      const currencies = await harness.listRecords<{ code: string; id: string }>("currencies");
      const usd = currencies.items.find((currency) => currency.code === "USD")!;
      const startDate = isoMonthsAgo(3);

      // The history hooks are loaded but the collection does not exist yet;
      // the write has to succeed anyway, which is why they swallow failures.
      const sub = await harness.createRecord<{ id: string }>("subscriptions", {
        currency: usd.id,
        cycle: monthly.id,
        frequency: 1,
        inactive: false,
        name: "Legacy sub",
        next_payment: isoMonthsAgo(0),
        price: 12,
        start_date: startDate,
        user: harness.admin!.record.id,
      });

      await harness.restart();

      const result = await harness.jsonRequest<HistoryResponse>(
        `/api/subscription/history?id=${sub.id}`,
        { token: harness.admin!.token },
      );

      expect(result.response.status, JSON.stringify(result.json)).toBe(200);
      expect(result.json.events).toHaveLength(1);
      expect(result.json.events[0]).toMatchObject({
        effective_date: startDate,
        event_type: "created",
        new_price: 12,
        note: "backfilled",
      });
      expect(result.json.totals.since).toBe(startDate);
      expect(result.json.totals.estimated_payments).toBe(4);
      expect(result.json.totals.estimated_total).toBe(48);

      // Re-running the migration must not double up the backfilled events.
      await harness.restart();
      const rerun = await harness.jsonRequest<HistoryResponse>(
        `/api/subscription/history?id=${sub.id}`,
        { token: harness.admin!.token },
      );
      expect(rerun.json.events).toHaveLength(1);
    });
  },
);
