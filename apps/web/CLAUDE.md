# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Use `bun` as the package manager.

```bash
bun run dev       # Start dev server at http://localhost:5173
bun run build     # Type-check + build to ../pb_public
bun run lint      # ESLint (zero warnings policy)
bun run preview   # Preview production build
```

There is no test suite configured.

## Architecture

**Zublo** is a subscription tracker frontend (React + TypeScript + Vite) that talks to a **PocketBase** backend running at `http://localhost:8080`. The production build outputs to `../pb_public`, where PocketBase serves it statically.

In development, Vite proxies `/api/*` to `http://localhost:8080`.

### Key files

- `src/lib/pb.ts` — PocketBase client singleton (auto-cancellation disabled)
- `src/types.ts` — All shared TypeScript interfaces (`User`, `Subscription`, `Currency`, etc.)
- `src/contexts/AuthContext.tsx` — Auth state; "admin" = the first registered user by creation date
- `src/lib/utils.ts` — `cn()` (clsx + tailwind-merge), `formatPrice()`, `toMonthly()`, `daysUntil()`, `subscriptionProgress()`
- `src/lib/toast.ts` — Toast notification helpers
- `src/lib/i18n.ts` — i18next setup with 16 locale files in `src/lib/locales/`
- `src/components/ui/` — Thin wrappers around Radix UI primitives

### Data fetching

All server state uses **TanStack Query** (`@tanstack/react-query`). The QueryClient is configured with `staleTime: 30_000` and `retry: 1`. Data is fetched via the PocketBase SDK (`pb.collection(...).getList/getOne/create/update/delete`).

### Routing

React Router v6 with two route guards in `App.tsx`:
- `ProtectedRoute` — redirects unauthenticated users to `/login`
- `AdminRoute` — restricts `/admin` to the first registered user

### Styling

Tailwind CSS with CSS custom properties for theming (colors defined as HSL variables in `index.css`). Dark mode uses the `dark` class on `<html>`. Users can override theme colors and inject custom CSS via their profile settings.

Use `cn()` from `@/lib/utils` for conditional class merging.

### Internationalization

All user-visible strings must go through `useTranslation()` / the `t()` function. Add new keys to all locale files in `src/lib/locales/`. The `@` path alias maps to `src/`.
