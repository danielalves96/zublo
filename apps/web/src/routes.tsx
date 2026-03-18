import {
  createRootRouteWithContext,
  createRoute,
  createRouter,
  redirect,
  Outlet,
} from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { lazy } from "react";

import { Layout } from "@/components/Layout";
import { AppTheme } from "@/components/AppTheme";
import { Toaster } from "sonner";

// Eagerly loaded (part of the auth shell — needed immediately)
const LoginPage = lazy(() =>
  import("@/pages/auth/LoginPage").then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import("@/pages/auth/RegisterPage").then((m) => ({ default: m.RegisterPage })),
);
const TotpPage = lazy(() =>
  import("@/pages/auth/TotpPage").then((m) => ({ default: m.TotpPage })),
);
const PasswordResetPage = lazy(() =>
  import("@/pages/auth/PasswordResetPage").then((m) => ({
    default: m.PasswordResetPage,
  })),
);

// Lazily loaded (only after authentication)
const DashboardPage = lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage })),
);
const SubscriptionsPage = lazy(() =>
  import("@/pages/SubscriptionsPage").then((m) => ({
    default: m.SubscriptionsPage,
  })),
);
const CalendarPage = lazy(() =>
  import("@/pages/CalendarPage").then((m) => ({ default: m.CalendarPage })),
);
const StatisticsPage = lazy(() =>
  import("@/pages/StatisticsPage").then((m) => ({ default: m.StatisticsPage })),
);
const SettingsPage = lazy(() =>
  import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })),
);
const AdminPage = lazy(() =>
  import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })),
);
const ChatPage = lazy(() =>
  import("@/pages/ChatPage").then((m) => ({ default: m.ChatPage })),
);

// Types for router context
import type { User, SettingsSearch, AdminSearch } from "@/types";

export interface RouterContext {
  queryClient: QueryClient;
  auth: {
    user: User | null;
    isLoading: boolean;
    isAdmin: boolean;
  };
}

// ─── Root Route ────────────────────────────────────────────────────────────────

const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <>
      <AppTheme />
      <Outlet />
      <Toaster richColors position="bottom-right" />
    </>
  ),
});

// ─── Auth Routes (public) ──────────────────────────────────────────────────────

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const registerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/register",
  component: RegisterPage,
});

const totpRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/totp",
  component: TotpPage,
});

const passwordResetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/password-reset",
  component: PasswordResetPage,
});

// ─── Protected Layout Route ────────────────────────────────────────────────────

const protectedLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "protected",
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) return;
    if (!context.auth.user) {
      throw redirect({ to: "/login" });
    }
  },
  component: Layout,
  pendingComponent: () => (
    <div className="flex h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  ),
});

// ─── Protected children routes ─────────────────────────────────────────────────

const indexRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});

const dashboardRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const subscriptionsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/subscriptions",
  component: SubscriptionsPage,
});

const calendarRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/calendar",
  component: CalendarPage,
});

const statisticsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/statistics",
  component: StatisticsPage,
});

export const settingsRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/settings",
  component: SettingsPage,
  validateSearch: (search: Record<string, unknown>): SettingsSearch => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
});

export const adminRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/admin",
  component: AdminPage,
  validateSearch: (search: Record<string, unknown>): AdminSearch => ({
    tab: typeof search.tab === "string" ? search.tab : undefined,
  }),
  beforeLoad: ({ context }) => {
    if (context.auth.isLoading) return;
    if (!context.auth.isAdmin) {
      throw redirect({ to: "/dashboard" });
    }
  },
});

const chatRoute = createRoute({
  getParentRoute: () => protectedLayoutRoute,
  path: "/chat",
  component: ChatPage,
});

// ─── Catch-all ─────────────────────────────────────────────────────────────────

const catchAllRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});

// ─── Build route tree ──────────────────────────────────────────────────────────

const routeTree = rootRoute.addChildren([
  loginRoute,
  registerRoute,
  totpRoute,
  passwordResetRoute,
  protectedLayoutRoute.addChildren([
    indexRoute,
    dashboardRoute,
    subscriptionsRoute,
    calendarRoute,
    statisticsRoute,
    settingsRoute,
    adminRoute,
    chatRoute,
  ]),
  catchAllRoute,
]);

// ─── Create router ─────────────────────────────────────────────────────────────

export function createAppRouter(context: RouterContext) {
  return createRouter({
    routeTree,
    context,
    defaultPreload: "intent",
  });
}

// Register the router for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
  interface HistoryState {
    email?: string;
    password?: string;
  }
}
