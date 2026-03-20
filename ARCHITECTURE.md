# Architecture

This document is the high-level architectural reference for the entire Zublo repository.

Use it when you need to understand:

- how the frontend and backend fit together
- where responsibilities live
- how requests flow through the system
- where to make changes without creating structural drift

For frontend-specific conventions and page composition rules, also read [apps/web/ARCHITECTURE.md](./apps/web/ARCHITECTURE.md).

## System Summary

Zublo is a compact full-stack application built around a simple deployment model:

- a React web frontend
- a PocketBase runtime
- custom backend behavior implemented through PocketBase hooks
- schema and data evolution implemented through PocketBase migrations
- a single container image that serves both the UI and API in production

The architecture is intentionally narrow. It avoids splitting the product into multiple deployable services unless the runtime actually needs that complexity.

## Design Goals

The repository is structured around these priorities:

1. easy self-hosting
2. compact operational footprint
3. clear ownership between frontend and backend code
4. straightforward feature development
5. easy reasoning for contributors and maintainers

This is why the project keeps:

- the React app and backend extensions in one repo
- a lightweight database model through PocketBase and SQLite
- a Docker-first runtime path
- domain-oriented hook and feature organization

## Top-Level Structure

```text
.
├── apps/
│   ├── backend/
│   └── web/
├── scripts/
├── Dockerfile
├── docker-compose.yml
├── Makefile
├── README.md
└── ARCHITECTURE.md
```

## Major Subsystems

## 1. Frontend: `apps/web`

The frontend is a React application built with Vite and TypeScript.

Primary responsibilities:

- rendering the authenticated product UI
- rendering auth flows
- orchestrating route-level queries and mutations
- presenting dashboard, subscriptions, calendar, statistics, settings, admin, and chat experiences
- calling backend routes and PocketBase-backed APIs through frontend service modules

Important frontend architectural traits:

- route tree and guards are defined centrally in `src/routes.tsx`
- page files act as composition roots
- domain UI lives in feature folders under `src/components/<feature>`
- backend-facing logic is isolated in `src/services`
- reusable primitives live in `src/components/ui`

Detailed frontend guidance lives in [apps/web/ARCHITECTURE.md](./apps/web/ARCHITECTURE.md).

## 2. Backend Runtime: `apps/backend`

The backend is built on PocketBase rather than a custom Node server.

Primary responsibilities:

- serving the production frontend build
- exposing PocketBase collections and auth behavior
- running custom domain routes
- running scheduled jobs
- loading schema/data migrations
- persisting application data in `pb_data`

This design keeps the runtime small and deployment simple while still allowing product-specific backend behavior.

## 3. Backend Hooks: `apps/backend/pb_hooks`

Custom backend logic is organized primarily by domain.

Current route and job groupings include:

- auth
- API keys
- subscriptions
- payments
- costs
- calendar
- chat
- chat history
- notifications
- admin
- cron/system jobs
- exchange-rate integration
- onboarding

That structure matters. It means backend customization is grouped around product capabilities instead of being hidden in one large procedural file.

## 4. Migrations: `apps/backend/pb_migrations`

Migrations are the repository’s schema evolution history.

They currently show the product evolving through areas such as:

- initial schema creation
- seeded data
- payment tracking
- reminder granularity
- color theme support
- API keys
- chat history timestamps
- security improvements for stored auth and provider keys
- TOTP and login challenge support

Contributors should treat migrations as part of the product’s architectural history, not just setup noise.

## 5. Runtime Data: `apps/backend/pb_data`

This is mutable application state and should be treated as runtime data, not source code.

It includes:

- SQLite database files
- uploaded or generated assets
- PocketBase-managed storage state

In real deployments, this directory must be persisted outside the container lifecycle.

## End-to-End Request Flow

In production, the request path is intentionally simple:

1. browser requests the application
2. PocketBase serves the built frontend from `pb_public`
3. frontend calls `/api/...`
4. PocketBase handles built-in functionality or dispatches into custom hook logic
5. hook logic reads or writes PocketBase data
6. persistent state lives in `/pb/pb_data`

In local development:

1. Vite serves the frontend on port `5173`
2. PocketBase runs separately on `8080`
3. Vite proxies `/api` requests to PocketBase

This split keeps frontend iteration fast while preserving a production runtime that is still single-container.

## Build and Packaging Flow

The Docker image is built in two stages:

### Stage 1: Frontend build

- Bun installs frontend dependencies
- Vite builds the frontend
- output is written into the backend static directory

### Stage 2: Runtime assembly

- Alpine image downloads the correct PocketBase binary for the target architecture
- backend hooks, migrations, and knowledge files are copied in
- built frontend assets are copied in
- runtime starts PocketBase through an entrypoint that handles permissions

This produces a deployment model with:

- one image
- one exposed port
- one persistent data directory

## Ownership Boundaries

The repository is healthiest when these boundaries stay clear:

### Frontend owns

- route composition
- page state
- visual presentation
- view-specific transformation
- user interaction flow

### Backend hooks own

- domain routes
- server-side mutations and integrations
- scheduled processes
- cross-user or protected server behavior

### Migrations own

- collection schema evolution
- required data transitions
- structural history of the backend model

### Docker/runtime owns

- packaging
- runtime assembly
- deployment ergonomics
- process and permission model

## Architectural Conventions

## Keep frontend and backend concerns separate

Do not hide backend policy inside UI components, and do not encode UI behavior inside backend hooks unless the backend genuinely owns the rule.

## Prefer domain grouping over technical dumping grounds

Good:

- `routes_subscriptions.pb.js`
- `src/components/subscriptions`

Bad:

- `misc.pb.js`
- `helpers-everything.ts`

## Keep deployment simple unless complexity is clearly justified

The current shape is one of the product’s strengths. Any change that introduces new services, sidecars, or infrastructure should be justified by a real product or operational need.

## Preserve the single mental model

A contributor should be able to answer:

- where does UI for this feature live?
- where does backend logic for this feature live?
- where is its schema history?
- how does it reach production?

If the structure no longer answers those questions quickly, the architecture is degrading.

## Change Guide

If you are changing:

### a frontend screen

Start with:

- [apps/web/ARCHITECTURE.md](./apps/web/ARCHITECTURE.md)
- `apps/web/src/pages`
- the matching feature folder under `apps/web/src/components`

### backend feature behavior

Start with:

- `apps/backend/pb_hooks`
- matching route or cron hook files
- any related service usage on the frontend

### schema or persisted data behavior

Start with:

- `apps/backend/pb_migrations`

### deployment behavior

Start with:

- `Dockerfile`
- `docker-compose.yml`
- `Makefile`
- `apps/backend/entrypoint.sh`

## Risks to Watch

The current structure is strong, but these are the failure modes to avoid:

- page files becoming feature dumps
- frontend service logic leaking into components
- product-specific backend behavior being spread across too many unrelated hook files
- runtime data accidentally treated as source-controlled truth
- deployment docs and deployment behavior drifting apart

## Recommended Reading Order

For a new contributor:

1. [README.md](./README.md)
2. this file
3. [apps/web/ARCHITECTURE.md](./apps/web/ARCHITECTURE.md) if touching the frontend
4. the relevant hook or migration files if touching backend behavior

## Final Principle

Zublo should remain small enough to understand as a product, not just as a collection of files.

That means:

- clear ownership
- shallow operational complexity
- domain-oriented structure
- documentation that matches the code

When in doubt, choose the design that makes the repository easier to explain to the next contributor.
