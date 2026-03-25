import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import net from "node:net";

import {
  PocketBaseIntegrationHarness,
  type PocketBaseErrorResponse,
} from "./setup.integration";

interface AiSettingsRecord {
  id: string;
  url: string;
  api_key_configured?: boolean;
  user: string;
}

interface MockProviderRequest {
  headers: IncomingMessage["headers"];
  method?: string;
  url?: string;
}

describe.sequential("pb_hooks/routes_ai.pb.js", () => {
  const harness = new PocketBaseIntegrationHarness();

  beforeEach(async () => {
    await harness.reset();
  });

  afterAll(async () => {
    await harness.stop();
  });

  it("rejects requests without authentication", async () => {
    const { json, response } = await harness.jsonRequest<PocketBaseErrorResponse>("/api/ai/models", {
      body: { url: "http://127.0.0.1:9999", api_key: "irrelevant" },
      method: "POST",
    });

    // PocketBase maps `ForbiddenError` to HTTP 403.
    expect(response.status).toBe(403);
    expect(json.message).toBe("Authentication required.");
  });

  it("falls back to the saved API URL and API key when the request body omits both values", async () => {
    const seenRequests: MockProviderRequest[] = [];
    const provider = await startJsonServer((req, res) => {
      seenRequests.push({
        headers: req.headers,
        method: req.method,
        url: req.url,
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "gpt-4o-mini" }, { id: "gpt-4.1" }] }));
    });

    try {
      await harness.createRecord<AiSettingsRecord>("ai_settings", {
        api_key: "saved-secret",
        enabled: true,
        model: "gpt-4o-mini",
        name: "Saved provider",
        api_key_configured: true,
        type: "custom",
        url: provider.baseUrl,
        user: harness.admin!.record.id,
      }, harness.superuser!.token);

      const { json, response } = await harness.jsonRequest<{ models: string[] }>("/api/ai/models", {
        body: {},
        method: "POST",
        token: harness.admin!.token,
      });

      expect(response.status, JSON.stringify(json)).toBe(200);
      expect(json.models).toEqual(["gpt-4o-mini", "gpt-4.1"]);
      expect(seenRequests).toHaveLength(1);
      expect(seenRequests[0].headers.authorization).toBe("Bearer saved-secret");
      expect(seenRequests[0].url).toBe("/models");

      // Route `/api/ai/models` is read-only. The persisted settings should stay
      // exactly as seeded and must still be the single backing record.
      const records = await harness.listRecords<AiSettingsRecord>("ai_settings");
      expect(records.items).toHaveLength(1);
      expect(records.items[0]).toMatchObject({
        url: provider.baseUrl,
        user: harness.admin!.record.id,
      });
      expect(records.items[0].api_key_configured).toBe(true);
    } finally {
      await provider.close();
    }
  });

  it("falls back to the saved API key when only a custom URL is provided in the request body", async () => {
    const seenRequests: MockProviderRequest[] = [];
    const provider = await startJsonServer((req, res) => {
      seenRequests.push({
        headers: req.headers,
        method: req.method,
        url: req.url,
      });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "gpt-4.1-mini" }] }));
    });

    try {
      await harness.createRecord<AiSettingsRecord>("ai_settings", {
        api_key: "persisted-key",
        enabled: true,
        model: "gpt-4.1-mini",
        name: "Saved provider",
        api_key_configured: true,
        type: "custom",
        url: "http://example.invalid/not-used",
        user: harness.admin!.record.id,
      }, harness.superuser!.token);

      const { json, response } = await harness.jsonRequest<{ models: string[] }>("/api/ai/models", {
        body: { url: provider.baseUrl },
        method: "POST",
        token: harness.admin!.token,
      });

      expect(response.status, JSON.stringify(json)).toBe(200);
      expect(json.models).toEqual(["gpt-4.1-mini"]);
      expect(seenRequests).toHaveLength(1);
      expect(seenRequests[0].headers.authorization).toBe("Bearer persisted-key");
      expect(seenRequests[0].url).toBe("/models");
    } finally {
      await provider.close();
    }
  });

  it("retries Google-compatible providers with x-goog-api-key after an initial 401 Bearer response", async () => {
    const seenRequests: MockProviderRequest[] = [];

    const provider = await startJsonServer((req, res) => {
      seenRequests.push({
        headers: req.headers,
        method: req.method,
        url: req.url,
      });

      if (seenRequests.length === 1) {
        res.writeHead(401, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Bearer auth not supported" }));
        return;
      }

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ models: [{ name: "models/gemini-1.5-flash" }] }));
    });

    try {
      const { json, response } = await harness.jsonRequest<{ models: string[] }>("/api/ai/models", {
        body: {
          api_key: "google-key",
          url: provider.baseUrl,
        },
        method: "POST",
        token: harness.admin!.token,
      });

      expect(response.status, JSON.stringify(json)).toBe(200);
      expect(json.models).toEqual(["gemini-1.5-flash"]);
      expect(seenRequests).toHaveLength(2);
      expect(seenRequests.map((request) => request.url)).toEqual(["/models", "/models"]);
      expect(seenRequests[0].headers.authorization).toBe("Bearer google-key");
      expect(seenRequests[0].headers["x-goog-api-key"]).toBeUndefined();
      expect(seenRequests[1].headers.authorization).toBeUndefined();
      expect(seenRequests[1].headers["x-goog-api-key"]).toBe("google-key");
    } finally {
      await provider.close();
    }
  });
});

async function startJsonServer(
  handler: (req: IncomingMessage, res: ServerResponse<IncomingMessage>) => void,
): Promise<{ baseUrl: string; close: () => Promise<void> }> {
  const port = await getFreePort();
  const server = createServer(handler);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => closeServer(server),
  };
}

async function getFreePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Failed to reserve a port for the mock AI provider."));
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
