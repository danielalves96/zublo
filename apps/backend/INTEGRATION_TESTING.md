# Backend Integration Testing

This backend uses PocketBase hook scripts (`*.pb.js`) that run inside PocketBase's Goja JavaScript VM.
Those files are hard to unit test directly because they depend on PocketBase runtime globals such as `$app`, `$http`, `routerAdd`, and `cronAdd`.

To cover that gap, the repository now uses live integration tests under `apps/backend/tests/pb_hooks/integration/`.

## What exists

- `tests/pb_hooks/integration/setup.integration.ts`
  Starts a disposable PocketBase process, applies migrations/hooks, creates a superuser, creates the first application user, and exposes helpers for seeding and record inspection.
- `tests/pb_hooks/integration/routes_ai.integration.test.ts`
  Covers the live `/api/ai/models` hook behavior, including auth failures, persisted fallback settings, and the Google API retry branch.
- `tests/pb_hooks/integration/cron_subscriptions.integration.test.ts`
  Covers the live `/api/cron/send_notifications` route and verifies deduplication through both the HTTP response and `notification_log` database state.

## Why `apps/backend/tsconfig.json` exists

The backend did not have its own TypeScript project file.
As a result, editors opened `setup.integration.ts` in an inferred TypeScript project with no Node types attached, which caused errors such as:

- `Cannot find module 'node:fs/promises'`
- missing Node globals and child process types
- missing `vitest` module types

`apps/backend/tsconfig.json` fixes that by:

- declaring a local TypeScript project for backend test files
- loading Node and Vitest types
- including `DOM` lib types so `fetch`, `Headers`, and `Response` resolve cleanly
- explicitly resolving packages from `apps/web/node_modules`, which is where the repo currently installs `typescript`, `vitest`, and `@types/node`

## Commands

Run the backend hook tests:

```bash
bun run test:back
```

Run only the new integration suites:

```bash
bun x vitest run --config apps/backend/vitest.config.mjs \
  apps/backend/tests/pb_hooks/integration/routes_ai.integration.test.ts \
  apps/backend/tests/pb_hooks/integration/cron_subscriptions.integration.test.ts
```

Run a backend-only type check for the integration test files:

```bash
./apps/web/node_modules/.bin/tsc -p apps/backend/tsconfig.json --noEmit
```

## Notes

- The integration harness starts a real PocketBase binary from `apps/backend/pocketbase`.
- Each suite resets its own temporary data directory, so tests stay isolated.
- These tests are intentionally slower than pure unit tests because they validate real hook registration and runtime behavior.
- If dependency installation layout changes later, update `apps/backend/tsconfig.json` paths and `typeRoots` first.
