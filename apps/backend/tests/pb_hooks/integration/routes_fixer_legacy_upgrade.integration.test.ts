import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  copyFileSync,
  writeFileSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

import {
  hasPocketBaseBinary,
  PocketBaseIntegrationHarness,
  type PocketBaseErrorResponse,
} from "./setup.integration";

interface FixerSettingsRecord {
  api_key?: string;
  api_key_configured?: boolean;
  enabled: boolean;
  id: string;
  provider: "fixer" | "apilayer";
  user: string;
}

const backendRoot = fileURLToPath(new URL("../../../", import.meta.url));
const realMigrationsDir = join(backendRoot, "pb_migrations");

// Migration 0017 as originally shipped: it marked fixer_settings.api_key as
// hidden:true. PocketBase never re-runs an already-applied migration, so an
// upgraded database keeps this stale, key-discarding schema until 0022 runs.
const LEGACY_0017 = `/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0017 — Hide fixer_settings.api_key from API responses.
 *
 * The UI only needs to know whether a Fixer/APILayer key is configured.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("fixer_settings");

    let hasConfiguredFlag = false;
    for (const f of col.fields) {
      if (f.name === "api_key_configured") {
        hasConfiguredFlag = true;
        break;
      }
    }

    if (!hasConfiguredFlag) {
      col.fields.add(new BoolField({ name: "api_key_configured", required: false }));
    }

    for (const f of col.fields) {
      if (f.name === "api_key") {
        f.hidden = true;
      }
    }

    app.save(col);

    const all = app.findRecordsByFilter("fixer_settings", "1=1", "", 0, 0);
    for (const record of all) {
      record.set("api_key_configured", String(record.get("api_key") || "").trim() !== "");
      app.save(record);
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId("fixer_settings");

    for (const f of col.fields) {
      if (f.name === "api_key") {
        f.hidden = false;
      }
    }

    col.fields = col.fields.filter((f) => f.name !== "api_key_configured");
    app.save(col);
  }
);
`;

describe.skipIf(!hasPocketBaseBinary).sequential(
  "fixer_settings API-key persistence on legacy (already-upgraded) installs",
  () => {
    const harness = new PocketBaseIntegrationHarness();
    let legacyMigrationsDir: string | null = null;

    beforeEach(() => {
      // Clone the real migrations directory and swap in the stale 0017. This
      // reproduces a database that upgraded from the version that marked
      // api_key hidden — the exact scenario migration 0022 exists to fix.
      legacyMigrationsDir = mkdtempSync(join(tmpdir(), "zublo-legacy-migrations-"));
      for (const entry of readdirSync(realMigrationsDir)) {
        if (!entry.endsWith(".js")) continue;
        copyFileSync(join(realMigrationsDir, entry), join(legacyMigrationsDir, entry));
      }
      writeFileSync(
        join(legacyMigrationsDir, "0017_secure_fixer_settings_api_key.js"),
        LEGACY_0017,
      );
      harness.useMigrationsDir(legacyMigrationsDir);
    });

    afterAll(async () => {
      await harness.stop();
      if (legacyMigrationsDir && existsSync(legacyMigrationsDir)) {
        rmSync(legacyMigrationsDir, { recursive: true, force: true });
      }
    });

    it("persists a user-submitted key after migration 0022 restores writes", async () => {
      await harness.reset();

      const result = await harness.jsonRequest<
        FixerSettingsRecord | PocketBaseErrorResponse
      >("/api/collections/fixer_settings/records", {
        body: {
          api_key: "legacy-upgraded-secret",
          enabled: true,
          provider: "fixer",
          user: harness.admin!.record.id,
        },
        method: "POST",
        token: harness.admin!.token,
      });

      expect(result.response.status, JSON.stringify(result.json)).toBe(200);
      const created = result.json as FixerSettingsRecord;
      expect(created.api_key).toBeUndefined();
      expect(created.api_key_configured).toBe(true);
    });
  },
);
