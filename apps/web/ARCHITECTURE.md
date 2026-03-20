# Web Architecture

This document explains how the frontend in `apps/web` is organized, why it is structured this way, and how contributors should extend it without turning pages into large, fragile files.

The short version:

- pages are composition roots
- feature folders hold feature-specific UI and view logic
- services talk to the backend
- `lib` holds shared app infrastructure
- `ui` holds reusable primitives, not product logic

If you keep those boundaries intact, the codebase stays understandable even as features grow.

## Goals

The frontend architecture is optimized for four things:

1. making page files easy to scan
2. keeping feature logic close to the feature that owns it
3. avoiding accidental coupling between unrelated screens
4. making refactors possible without rewriting half the app

This is not a "perfect abstraction" architecture. It is a practical structure for a product UI that needs to stay readable under ongoing feature work.

## Mental Model

Think of the frontend as five layers:

1. routes and pages decide what screen is being rendered
2. feature modules render product UI for a domain
3. services perform backend-facing operations
4. `lib` provides shared app-level infrastructure
5. `ui` provides low-level presentation primitives

Each layer should depend mostly downward:

- pages can use feature modules, services, `lib`, and `ui`
- feature modules can use services, `lib`, and `ui`
- services can use `lib`
- `ui` should not know about product domains

## Current Structure

The main frontend directories currently map cleanly to these responsibilities:

```text
src/
  components/
    admin/
    calendar/
    chat/
    dashboard/
    settings/
    statistics/
    subscriptions/
    ui/
  contexts/
  hooks/
  lib/
  pages/
    auth/
  services/
  routes.tsx
  types.ts
```

## Directory Responsibilities

## `src/pages`

Pages are the composition roots of the application.

A page should own:

- route-level composition
- search params and navigation concerns
- top-level query and mutation wiring
- page-scoped modal state
- passing data and callbacks into feature components

A page should not become the place where all detailed UI, formatting logic, and interaction handling accumulate.

Current page files:

- `DashboardPage.tsx`
- `SubscriptionsPage.tsx`
- `CalendarPage.tsx`
- `StatisticsPage.tsx`
- `SettingsPage.tsx`
- `AdminPage.tsx`
- `ChatPage.tsx`
- auth pages under `src/pages/auth`

When a page grows, the default move is not "add more helpers inside the page file." The default move is to extract responsibility into a feature folder.

## `src/components/<feature>`

Feature folders are where product-specific UI belongs.

Examples already present in the codebase:

- `src/components/calendar`
- `src/components/chat`
- `src/components/dashboard`
- `src/components/statistics`
- `src/components/subscriptions`
- `src/components/settings`
- `src/components/admin`

Feature folders may contain:

- section components
- dialogs and side panels
- feature-local derived data hooks
- feature-local constants
- feature-local types
- configuration objects for rendering tabs or screen sections

This keeps the code needed to understand a feature mostly in one place.

## `src/components/ui`

This folder contains reusable interface primitives and shared building blocks.

Examples:

- buttons
- dialogs
- inputs
- popovers
- labels
- switches
- layout primitives like `SidebarTabsLayout`

Rules for `ui`:

- no feature-specific business logic
- no direct assumptions about subscriptions, settings, chat, or admin
- keep APIs generic enough to be reused in multiple parts of the product

If a component only makes sense for one domain, it probably does not belong in `ui`.

## `src/services`

Services are the boundary between frontend UI code and backend access.

Examples:

- `subscriptions.ts`
- `paymentRecords.ts`
- `auth.ts`
- `apiKeys.ts`
- `notifications.ts`
- `ai.ts`

Services should be the first place to look when:

- a screen needs backend data
- a mutation needs to be added
- several screens need the same backend operation

Services should not contain visual formatting logic or JSX-related behavior.

## `src/lib`

`lib` is for shared application infrastructure and cross-feature helpers.

Examples currently in the project:

- API client setup
- PocketBase client wiring
- query keys
- i18n setup and locale files
- generic utilities
- toast helpers
- constants used across features

Only put code in `lib` when it is truly shared or infrastructural.

If something exists only to simplify one feature page, keep it inside that feature instead of promoting it too early.

## `src/contexts`

Contexts should be used sparingly for app-wide state that needs broad availability.

Right now, `AuthContext` is a clear example of the right use case:

- authentication state is global
- many routes and screens depend on it
- route guards and layout behavior rely on it

Do not add a context just to avoid prop drilling inside one feature.

## `src/hooks`

Top-level hooks in `src/hooks` should be reserved for shared hooks that are useful across features or are not owned by a single feature directory.

Examples:

- `useSummaryData`
- `useYearlyCosts`
- `useAIRecommendations`

If a hook exists only to support one page or one feature module, keep it near that feature.

## Route and Page Flow

The route tree is defined in `src/routes.tsx`.

Important architectural facts:

- auth pages are separate from the protected app shell
- protected routes render inside `Layout`
- admin access is guarded at route level
- authenticated routes lazy-load most major screens

This means route-level concerns belong in:

- `routes.tsx`
- auth context
- top-level page components

Do not hide route authorization or redirect behavior deep inside feature components.

## Recommended Page Pattern

For a non-trivial screen, use this shape:

1. page file wires route, queries, mutations, and high-level state
2. page renders feature sections from `src/components/<feature>/`
3. dense view transformations move into a feature-local hook
4. repeated feature-specific helpers stay inside the feature folder

Example shape:

```text
src/pages/
  DashboardPage.tsx

src/components/dashboard/
  DashboardHeader.tsx
  SummaryCard.tsx
  BudgetOverviewCard.tsx
  CostHistoryCard.tsx
  AIRecommendationsCard.tsx
  useDashboardDerivedData.ts
```

For a larger flow:

```text
src/pages/
  ChatPage.tsx

src/components/chat/
  ChatHeader.tsx
  ChatSidebar.tsx
  ChatMessagesPanel.tsx
  ChatComposer.tsx
  useChatPageController.ts
  constants.ts
  utils.ts
  chat.types.ts
```

## What Stays In A Page

- route params and search params
- navigation actions
- query and mutation wiring
- page-level modal or disclosure state
- assembly of feature sections
- passing callbacks and loaded data into feature components

## What Leaves A Page

- dense JSX blocks with their own responsibility
- view-specific grouping, sorting, and transformation
- large toolbar blocks
- repeated section wrappers
- feature-specific dialogs
- table and chart rendering
- feature-only utility helpers

## Extraction Heuristics

Extract code out of a page when one or more of these is true:

- the page mixes async orchestration with several visually dense sections
- meaningful derived data makes the main user flow hard to see
- the same domain concept is represented in multiple large JSX blocks
- adding one more behavior would make the page materially harder to review
- a contributor can no longer understand the feature by reading top to bottom

Do not extract just to create wrappers with no responsibility.

Bad extraction:

- `PageBody.tsx` that only forwards props without owning logic
- tiny components created only to reduce line count

Good extraction:

- a calendar day panel with real rendering responsibility
- a derived data hook for statistics grouping
- a feature config file that drives tab rendering

## Feature Module Conventions

Inside a feature folder, use names that communicate responsibility clearly.

Good patterns already present in this repository:

- `*Header.tsx`
- `*Card.tsx`
- `*Dialog.tsx`
- `*Modal.tsx`
- `constants.ts`
- `types.ts` or `*.types.ts`
- `use*DerivedData.ts`
- `use*Controller.ts`
- `*.config.tsx`

Prefer names that describe UI or behavior rather than generic names like:

- `helpers.ts`
- `data.ts`
- `misc.ts`
- `common.ts`

Those names become useless quickly as a feature grows.

## Shared vs Feature-Local Code

Use this decision rule:

- if only one feature needs it, keep it in that feature folder
- if multiple product features need it, consider `lib`
- if it is a reusable primitive with no business meaning, consider `ui`
- if it performs backend operations, put it in `services`

Examples:

- currency formatting used across the app: `lib`
- API call to save notifications: `services`
- dialog shell: `ui`
- statistics-specific chart adapter: `components/statistics`

## Settings and Admin

`settings` and `admin` are naturally broad domains, so they need extra discipline.

Current structure already reflects this:

- settings is broken into subdomains such as `api-keys`, `profile`, `notifications`, `two-factor`, `currencies`, and `payment-methods`
- admin is split into focused areas such as `users`, `security`, `smtp`, `oidc`, `registration`, and maintenance-related sections

For these areas:

- keep each subdomain isolated
- use config files to describe tab or section structure when appropriate
- avoid pulling all logic back into `SettingsPage.tsx` or `AdminPage.tsx`

## Data Flow Guidance

The usual frontend data flow should be:

1. page or feature hook calls a service
2. service talks to PocketBase or backend route
3. result is transformed only as much as needed for the current view
4. feature components receive prepared data and callbacks

Keep these concerns separate:

- fetching data
- transforming data for rendering
- rendering UI

When these collapse into a single file, review and refactoring become harder.

## Common Anti-Patterns

Avoid these:

- putting backend request code directly inside large JSX files
- moving feature-specific code into `lib` just because it is convenient
- creating global contexts for local state
- adding domain knowledge to `ui` primitives
- storing route logic inside leaf components
- extracting too many tiny wrappers that hide the real flow

## Existing Patterns Worth Preserving

These areas already reflect the intended architecture and should be treated as examples:

- `src/components/calendar`
- `src/components/chat`
- `src/components/dashboard`
- `src/components/statistics`
- `src/components/subscriptions`
- `src/components/settings`
- `src/components/admin`

When adding a new screen, follow the same style instead of inventing a parallel structure.

## Contributor Checklist

Before opening a PR for frontend structural work, check:

- does the page still read as a composition root?
- is feature-specific logic kept near the feature?
- did any domain logic leak into `ui`?
- did any single-feature helper get promoted into `lib` too early?
- is route logic still visible at page or router level?
- are names specific enough to age well?

## Validation

For frontend architectural refactors, run:

```bash
bun run type-check
bun run lint
bun run build
```

For targeted page refactors, also run focused linting when useful:

```bash
bun run eslint src/pages/<PageName>.tsx src/components/<feature> --ext ts,tsx
```

## Final Rule

Optimize for clarity of ownership, not abstraction count.

A contributor should be able to answer these questions quickly:

- which page owns this screen?
- which feature folder owns this behavior?
- where does this data come from?
- is this shared infrastructure, reusable UI, or feature code?

If the structure makes those answers obvious, the architecture is doing its job.
