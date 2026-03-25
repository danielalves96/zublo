import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const backendRoot = fileURLToPath(new URL("../../../", import.meta.url));
const pocketbaseBinary = resolve(backendRoot, "pocketbase");
const hooksDir = resolve(backendRoot, "pb_hooks");
const migrationsDir = resolve(backendRoot, "pb_migrations");
const publicDir = resolve(backendRoot, "pb_public");

const DEFAULT_PASSWORD = "Password123!";
const DEFAULT_ADMIN_EMAIL = "integration-admin@zublo.test";
const DEFAULT_SUPERUSER_EMAIL = "integration-superuser@zublo.test";

export interface AuthRecord {
  id: string;
  email: string;
  username?: string;
  name?: string;
}

export interface AuthSession {
  token: string;
  record: AuthRecord;
}

export interface ListResult<TItem> {
  items: TItem[];
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface PocketBaseErrorResponse {
  code?: number;
  data?: Record<string, unknown>;
  message?: string;
}

interface JsonRequestOptions {
  body?: unknown;
  headers?: HeadersInit;
  method?: string;
  token?: string;
}

/**
 * Small utility wrapper around a disposable PocketBase process.
 *
 * Each test file should create its own harness instance. That keeps the live
 * server isolated per suite, which is simpler and more robust than trying to
 * share one mutable database across parallel Vitest workers.
 */
export class PocketBaseIntegrationHarness {
  baseUrl = "";
  admin: AuthSession | null = null;
  superuser: AuthSession | null = null;

  private child: ChildProcessWithoutNullStreams | null = null;
  private dataDir: string | null = null;
  private logs: string[] = [];

  /**
   * Hard-reset the entire PocketBase runtime.
   *
   * The method stops any running process, deletes the temporary SQLite data
   * directory, starts a brand new PocketBase instance, waits for migrations +
   * seed data to finish, and finally registers the first user.
   *
   * In this repository the first created user is also treated as the
   * application admin by `routes_cron.pb.js`, so we create that user here.
   */
  async reset(): Promise<void> {
    await this.stop();

    this.logs = [];
    this.dataDir = await mkdtemp(join(tmpdir(), "zublo-pb-integration-"));

    await this.runPocketBaseCommand([
      "--dir",
      this.dataDir,
      "--hooksDir",
      hooksDir,
      "--migrationsDir",
      migrationsDir,
      "--publicDir",
      publicDir,
      "superuser",
      "upsert",
      DEFAULT_SUPERUSER_EMAIL,
      DEFAULT_PASSWORD,
    ]);

    const port = await getFreePort();
    this.baseUrl = `http://127.0.0.1:${port}`;

    const args = [
      "serve",
      "--dev",
      "--http",
      `127.0.0.1:${port}`,
      "--dir",
      this.dataDir,
      "--hooksDir",
      hooksDir,
      "--migrationsDir",
      migrationsDir,
      "--publicDir",
      publicDir,
      "--hooksWatch=false",
      "--indexFallback=false",
    ];

    this.child = spawn(pocketbaseBinary, args, {
      cwd: backendRoot,
      env: process.env,
      stdio: "pipe",
    });

    this.child.stdout.on("data", (chunk) => {
      this.logs.push(`[stdout] ${String(chunk).trimEnd()}`);
    });

    this.child.stderr.on("data", (chunk) => {
      this.logs.push(`[stderr] ${String(chunk).trimEnd()}`);
    });

    this.child.on("exit", (code, signal) => {
      this.logs.push(`[process] exited with code=${String(code)} signal=${String(signal)}`);
    });

    await waitForPocketBaseReady(this.baseUrl, () => this.dumpLogs());

    // Seed the first authenticated application user.
    this.admin = await this.registerAndLoginUser({
      email: DEFAULT_ADMIN_EMAIL,
      name: "Integration Admin",
      password: DEFAULT_PASSWORD,
      username: "integration-admin",
    });
    this.superuser = await this.loginSuperuser();
  }

  async stop(): Promise<void> {
    const child = this.child;
    this.child = null;
    this.admin = null;
    this.superuser = null;

    if (child) {
      await terminateProcess(child);
    }

    if (this.dataDir) {
      await rm(this.dataDir, { force: true, recursive: true });
      this.dataDir = null;
    }
  }

  async registerAndLoginUser(input: {
    email: string;
    name: string;
    password?: string;
    username: string;
  }): Promise<AuthSession> {
    const password = input.password ?? DEFAULT_PASSWORD;

    const createResponse = await this.jsonRequest<AuthRecord | PocketBaseErrorResponse>(
      "/api/collections/users/records",
      {
        method: "POST",
        body: {
          email: input.email,
          emailVisibility: true,
          name: input.name,
          password,
          passwordConfirm: password,
          username: input.username,
        },
      },
    );

    if (!createResponse.response.ok) {
      throw new Error(
        `Failed to create user ${input.email}: ${JSON.stringify(createResponse.json)}\n${this.dumpLogs()}`,
      );
    }

    const authResponse = await this.jsonRequest<AuthSession | PocketBaseErrorResponse>(
      "/api/collections/users/auth-with-password",
      {
        method: "POST",
        body: {
          identity: input.email,
          password,
        },
      },
    );

    if (!authResponse.response.ok) {
      throw new Error(
        `Failed to authenticate user ${input.email}: ${JSON.stringify(authResponse.json)}\n${this.dumpLogs()}`,
      );
    }

    return authResponse.json as AuthSession;
  }

  async loginSuperuser(): Promise<AuthSession> {
    const attempts = [
      "/api/collections/_superusers/auth-with-password",
      "/api/admins/auth-with-password",
    ];

    for (const path of attempts) {
      const response = await this.jsonRequest<AuthSession | PocketBaseErrorResponse>(path, {
        method: "POST",
        body: {
          identity: DEFAULT_SUPERUSER_EMAIL,
          password: DEFAULT_PASSWORD,
        },
      });

      if (response.response.ok) {
        return response.json as AuthSession;
      }
    }

    throw new Error(`Failed to authenticate the PocketBase superuser.\n${this.dumpLogs()}`);
  }

  async createRecord<TRecord extends object>(
    collection: string,
    data: Record<string, unknown>,
    token = this.requireAdmin().token,
  ): Promise<TRecord> {
    const result = await this.jsonRequest<TRecord | PocketBaseErrorResponse>(
      `/api/collections/${collection}/records`,
      {
        method: "POST",
        body: data,
        token,
      },
    );

    if (!result.response.ok) {
      throw new Error(
        `Failed to create ${collection} record: ${JSON.stringify(result.json)}\n${this.dumpLogs()}`,
      );
    }

    return result.json as TRecord;
  }

  async listRecords<TRecord extends object>(
    collection: string,
    options: {
      filter?: string;
      perPage?: number;
      token?: string;
    } = {},
  ): Promise<ListResult<TRecord>> {
    const params = new URLSearchParams({
      page: "1",
      perPage: String(options.perPage ?? 200),
    });

    if (options.filter) {
      params.set("filter", options.filter);
    }

    const result = await this.jsonRequest<ListResult<TRecord>>(
      `/api/collections/${collection}/records?${params.toString()}`,
      {
        method: "GET",
        token: options.token ?? this.requireAdmin().token,
      },
    );

    if (!result.response.ok) {
      throw new Error(
        `Failed to list ${collection} records: ${JSON.stringify(result.json)}\n${this.dumpLogs()}`,
      );
    }

    return result.json as ListResult<TRecord>;
  }

  async jsonRequest<TJson>(
    path: string,
    options: JsonRequestOptions = {},
  ): Promise<{ json: TJson; response: Response }> {
    const headers = new Headers(options.headers ?? {});

    if (options.body !== undefined && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    if (options.token) {
      headers.set("Authorization", `Bearer ${options.token}`);
    }

    const response = await fetch(new URL(path, this.baseUrl), {
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      headers,
      method: options.method ?? "GET",
    });

    const rawText = await response.text();
    const json = rawText.length > 0 ? (JSON.parse(rawText) as TJson) : ({} as TJson);

    return { json, response };
  }

  dumpLogs(): string {
    return this.logs.join("\n");
  }

  private async runPocketBaseCommand(args: string[]): Promise<void> {
    const output: string[] = [];

    await new Promise<void>((resolve, reject) => {
      const child = spawn(pocketbaseBinary, args, {
        cwd: backendRoot,
        env: process.env,
        stdio: "pipe",
      });

      child.stdout.on("data", (chunk) => {
        output.push(`[command stdout] ${String(chunk).trimEnd()}`);
      });

      child.stderr.on("data", (chunk) => {
        output.push(`[command stderr] ${String(chunk).trimEnd()}`);
      });

      child.on("exit", (code) => {
        if (code === 0) {
          if (output.length > 0) {
            this.logs.push(...output);
          }
          resolve();
          return;
        }

        reject(
          new Error(
            `PocketBase command failed with exit code ${String(code)}.\n${output.join("\n")}`,
          ),
        );
      });

      child.on("error", reject);
    });
  }

  private requireAdmin(): AuthSession {
    if (!this.admin) {
      throw new Error("PocketBase admin session is not available. Did you call reset()?");
    }

    return this.admin;
  }
}

async function getFreePort(): Promise<number> {
  return new Promise<number>((resolvePort, reject) => {
    const server = net.createServer();

    server.unref();
    server.on("error", reject);

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        reject(new Error("Failed to allocate a TCP port for PocketBase integration tests."));
        return;
      }

      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolvePort(address.port);
      });
    });
  });
}

async function waitForPocketBaseReady(baseUrl: string, getLogs: () => string): Promise<void> {
  const deadline = Date.now() + 15_000;
  let lastError: unknown = null;

  while (Date.now() < deadline) {
    try {
      // `cycles` is created by the first migration and seeded by the second.
      // A successful response here proves that:
      // 1. the HTTP server is listening
      // 2. migrations have been applied
      // 3. the initial seed data exists
      const response = await fetch(`${baseUrl}/api/collections/cycles/records?page=1&perPage=1`);

      if (response.ok) {
        return;
      }

      lastError = new Error(`Unexpected status while waiting for PocketBase: ${response.status}`);
    } catch (error) {
      lastError = error;
    }

    await delay(200);
  }

  throw new Error(
    `PocketBase did not become ready in time: ${String(lastError)}\n${getLogs()}`,
  );
}

async function terminateProcess(child: ChildProcessWithoutNullStreams): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const exitPromise = new Promise<void>((resolve) => {
    child.once("exit", () => resolve());
  });

  child.kill("SIGTERM");

  await Promise.race([exitPromise, delay(5_000)]);

  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await exitPromise;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolveDelay) => {
    setTimeout(resolveDelay, ms);
  });
}
