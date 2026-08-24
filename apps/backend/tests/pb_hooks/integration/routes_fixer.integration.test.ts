import { afterAll, beforeEach, describe, expect, it } from "vitest";

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

describe
  .skipIf(!hasPocketBaseBinary)
  .sequential("fixer settings API-key persistence", () => {
    const harness = new PocketBaseIntegrationHarness();

    beforeEach(async () => {
      await harness.reset();
    });

    afterAll(async () => {
      await harness.stop();
    });

    it("persists a user-submitted key without returning it in record responses", async () => {
      const createResult = await harness.jsonRequest<
        FixerSettingsRecord | PocketBaseErrorResponse
      >("/api/collections/fixer_settings/records", {
        body: {
          api_key: "saved-secret",
          // The server must ignore a stale or malicious client-side flag.
          api_key_configured: false,
          enabled: true,
          provider: "fixer",
          user: harness.admin!.record.id,
        },
        method: "POST",
        token: harness.admin!.token,
      });

      expect(
        createResult.response.status,
        JSON.stringify(createResult.json),
      ).toBe(200);
      const created = createResult.json as FixerSettingsRecord;
      expect(created.api_key).toBeUndefined();
      expect(created.api_key_configured).toBe(true);

      // Omitting api_key must retain the persisted secret. Deriving the flag on
      // this update proves the next request can still read the saved value.
      const updateResult = await harness.jsonRequest<
        FixerSettingsRecord | PocketBaseErrorResponse
      >(`/api/collections/fixer_settings/records/${created.id}`, {
        body: {
          api_key_configured: false,
          provider: "apilayer",
        },
        method: "PATCH",
        token: harness.admin!.token,
      });

      expect(
        updateResult.response.status,
        JSON.stringify(updateResult.json),
      ).toBe(200);
      const updated = updateResult.json as FixerSettingsRecord;
      expect(updated.api_key).toBeUndefined();
      expect(updated.api_key_configured).toBe(true);
      expect(updated.provider).toBe("apilayer");

      const records =
        await harness.listRecords<FixerSettingsRecord>("fixer_settings");
      expect(records.items).toHaveLength(1);
      expect(records.items[0].api_key).toBeUndefined();
      expect(records.items[0].api_key_configured).toBe(true);

      const clearResult = await harness.jsonRequest<
        FixerSettingsRecord | PocketBaseErrorResponse
      >(`/api/collections/fixer_settings/records/${created.id}`, {
        body: {
          api_key: "",
          api_key_configured: true,
        },
        method: "PATCH",
        token: harness.admin!.token,
      });

      expect(
        clearResult.response.status,
        JSON.stringify(clearResult.json),
      ).toBe(200);
      const cleared = clearResult.json as FixerSettingsRecord;
      expect(cleared.api_key).toBeUndefined();
      expect(cleared.api_key_configured).toBe(false);
    });

    it("blocks a user from creating a fixer_settings record owned by someone else", async () => {
      const attacker = await harness.registerAndLoginUser({
        email: "integration-attacker@zublo.test",
        name: "Integration Attacker",
        username: "integration-attacker",
      });

      const result = await harness.jsonRequest<
        FixerSettingsRecord | PocketBaseErrorResponse
      >("/api/collections/fixer_settings/records", {
        body: {
          api_key: "stolen-key",
          enabled: true,
          provider: "fixer",
          user: harness.admin!.record.id,
        },
        method: "POST",
        token: attacker.token,
      });

      expect(result.response.status, JSON.stringify(result.json)).toBe(400);
    });
  });
