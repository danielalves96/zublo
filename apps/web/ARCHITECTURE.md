# Web Architecture

## Goal

Keep page files easy to scan for contributors by making each page a composition root, not a place where UI details, derived calculations, and async orchestration all mix together.

## Current Page Pattern

Use this structure for non-trivial screens in `src/pages`:

1. The page owns routing, page-level state, queries, mutations, and top-level handlers.
2. Feature UI lives in `src/components/<feature>/`.
3. Derived data and view-specific transformations live in `src/components/<feature>/use*.ts` when they are reused or make the page noisy.
4. Feature-specific types and constants stay close to the feature.

## Folder Convention

```text
src/pages/
  DashboardPage.tsx

src/components/dashboard/
  DashboardHeader.tsx
  CostHistoryCard.tsx
  BudgetOverviewCard.tsx
  AIRecommendationsCard.tsx
  useDashboardDerivedData.ts
```

For larger flows, the feature can also have:

```text
src/components/chat/
  ChatHeader.tsx
  ChatSidebar.tsx
  ChatMessagesPanel.tsx
  ChatComposer.tsx
  useChatPageController.ts
  utils.ts
  constants.ts
  chat.types.ts
```

## What Stays In The Page

- Route search params and navigation
- Query and mutation wiring
- Page-level modal state
- High-level composition of sections
- Passing data and callbacks into feature components

## What Leaves The Page

- Dense JSX blocks with their own responsibility
- Chart rendering
- Tables and list rendering
- Sidebar and toolbar UIs
- Derived metrics, grouping, sorting, and formatting prep
- Feature-local helpers that are not generic app utilities

## Refactor Threshold

Refactor a page when at least one of these is true:

- The page mixes query orchestration and several dense visual sections
- The page contains meaningful derived data that hides the main flow
- A single file is becoming the only place where the feature can be understood
- Repeated UI patterns or handlers are making changes risky

Do not refactor just to create tiny wrappers with no responsibility.

## Existing Feature Modules

The following already follow this pattern:

- `src/components/admin`
- `src/components/settings/api-keys`
- `src/components/settings`
- `src/components/subscriptions`
- `src/components/calendar`
- `src/components/dashboard`
- `src/components/statistics`
- `src/components/chat`

## Contributor Rules

- Prefer adding new screen-specific code under a feature folder instead of growing the page file.
- Keep reusable primitives in `src/components/ui`.
- Keep generic helpers in `src/lib` only if they are truly cross-feature.
- If a hook only exists to make one page readable, keep it beside that feature instead of promoting it too early.
- When refactoring, preserve behavior first and validate with type-check and targeted eslint.

## Validation

For page refactors, run:

```bash
bun run type-check
bun run eslint src/pages/<PageName>.tsx src/components/<feature> --ext ts,tsx
```
