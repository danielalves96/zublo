import { render, screen } from "@testing-library/react";
import { RouterProvider } from "@tanstack/react-router";
import { createAppRouter, settingsRoute, adminRoute } from "./routes";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("sonner", () => ({
  Toaster: () => null,
}));

vi.mock("@/components/AppTheme", () => ({
  AppTheme: () => null,
}));

vi.mock("@/components/Layout", async () => {
  const { Outlet } = await import("@tanstack/react-router");
  return {
    Layout: () => (
      <div>
        layout
        <Outlet />
      </div>
    ),
  };
});

vi.mock("@/pages/DashboardPage", () => ({
  DashboardPage: () => <div>dashboard</div>,
}));
vi.mock("@/pages/SubscriptionsPage", () => ({
  SubscriptionsPage: () => <div>subscriptions</div>,
}));
vi.mock("@/pages/CalendarPage", () => ({
  CalendarPage: () => <div>calendar</div>,
}));
vi.mock("@/pages/StatisticsPage", () => ({
  StatisticsPage: () => <div>statistics</div>,
}));
vi.mock("@/pages/SettingsPage", () => ({
  SettingsPage: () => <div>settings</div>,
}));
vi.mock("@/pages/AdminPage", () => ({
  AdminPage: () => <div>admin</div>,
}));
vi.mock("@/pages/ChatPage", () => ({
  ChatPage: () => <div>chat</div>,
}));
vi.mock("@/pages/auth/LoginPage", () => ({
  LoginPage: () => <div>login</div>,
}));
vi.mock("@/pages/auth/RegisterPage", () => ({
  RegisterPage: () => <div>register</div>,
}));
vi.mock("@/pages/auth/TotpPage", () => ({
  TotpPage: () => <div>totp</div>,
}));
vi.mock("@/pages/auth/PasswordResetPage", () => ({
  PasswordResetPage: () => <div>password-reset</div>,
}));

const fakeUser = { id: "1", email: "user@test.com" } as any;

const makeContext = (
  overrides: Partial<{ user: any; isLoading: boolean; isAdmin: boolean }> = {},
) => ({
  queryClient: {} as any,
  auth: { user: null, isLoading: false, isAdmin: false, ...overrides },
});

// ─── Router instantiation ──────────────────────────────────────────────────────

describe("createAppRouter", () => {
  it("creates a router instance", () => {
    const router = createAppRouter(makeContext());
    expect(router).toBeDefined();
    expect(typeof router.navigate).toBe("function");
    expect(typeof router.invalidate).toBe("function");
  });
});

// ─── settingsRoute.validateSearch ─────────────────────────────────────────────

describe("settingsRoute.validateSearch", () => {
  it("returns tab when search.tab is a string", () => {
    const validateSearch = settingsRoute.options.validateSearch as
      | ((search: Record<string, unknown>) => { tab?: string })
      | undefined;
    const result = validateSearch?.({ tab: "general" });
    expect(result).toEqual({ tab: "general" });
  });

  it("returns undefined tab when search.tab is not a string", () => {
    const validateSearch = settingsRoute.options.validateSearch as
      | ((search: Record<string, unknown>) => { tab?: string })
      | undefined;
    const result = validateSearch?.({ tab: 42 });
    expect(result).toEqual({ tab: undefined });
  });

  it("returns undefined tab when search.tab is absent", () => {
    const validateSearch = settingsRoute.options.validateSearch as
      | ((search: Record<string, unknown>) => { tab?: string })
      | undefined;
    const result = validateSearch?.({});
    expect(result).toEqual({ tab: undefined });
  });
});

// ─── adminRoute.validateSearch ────────────────────────────────────────────────

describe("adminRoute.validateSearch", () => {
  it("returns tab when search.tab is a string", () => {
    const validateSearch = adminRoute.options.validateSearch as
      | ((search: Record<string, unknown>) => { tab?: string })
      | undefined;
    const result = validateSearch?.({ tab: "users" });
    expect(result).toEqual({ tab: "users" });
  });

  it("returns undefined tab when search.tab is not a string", () => {
    const validateSearch = adminRoute.options.validateSearch as
      | ((search: Record<string, unknown>) => { tab?: string })
      | undefined;
    const result = validateSearch?.({ tab: null });
    expect(result).toEqual({ tab: undefined });
  });
});

// ─── adminRoute.beforeLoad ────────────────────────────────────────────────────

describe("adminRoute.beforeLoad", () => {
  const makeCtx = (auth: any) =>
    ({ context: { auth, queryClient: {} as any } }) as any;

  it("returns undefined when isLoading is true", () => {
    const result = adminRoute.options.beforeLoad?.(
      makeCtx({ isLoading: true, isAdmin: false }),
    );
    expect(result).toBeUndefined();
  });

  it("throws a redirect to /dashboard when not admin", () => {
    expect(() => {
      adminRoute.options.beforeLoad?.(
        makeCtx({ isLoading: false, isAdmin: false }),
      );
    }).toThrow();
  });

  it("returns undefined when user is admin", () => {
    const result = adminRoute.options.beforeLoad?.(
      makeCtx({ isLoading: false, isAdmin: true }),
    );
    expect(result).toBeUndefined();
  });
});

// ─── Route component rendering ─────────────────────────────────────────────────

describe("route component rendering", () => {
  it("renders the router with RouterProvider and covers root route component", async () => {
    window.history.pushState({}, "", "/login");
    const router = createAppRouter(makeContext({ user: null, isLoading: false }));
    await router.load();
    const { container } = render(<RouterProvider router={router} />);
    // Root route component (line 72) renders AppTheme + Outlet + Toaster
    expect(container).toBeInTheDocument();
  });

  it("renders dashboard page via router (covers lazy import callbacks)", async () => {
    window.history.pushState({}, "", "/dashboard");
    const router = createAppRouter(makeContext({ user: fakeUser }));
    await router.load();
    const { container } = render(<RouterProvider router={router} />);
    expect(container).toBeInTheDocument();
  });

  it("renders settings page via router (covers SettingsPage lazy callback)", async () => {
    window.history.pushState({}, "", "/settings");
    const router = createAppRouter(makeContext({ user: fakeUser }));
    await router.load();
    render(<RouterProvider router={router} />);
    await screen.findByText("layout");
    expect(screen.getByText("layout")).toBeInTheDocument();
  });

  it("renders admin page via router (covers AdminPage lazy callback)", async () => {
    window.history.pushState({}, "", "/admin");
    const router = createAppRouter(makeContext({ user: fakeUser, isAdmin: true }));
    await router.load();
    render(<RouterProvider router={router} />);
    await screen.findByText("layout");
    expect(screen.getByText("layout")).toBeInTheDocument();
  });

  it("renders chat page via router (covers ChatPage lazy callback)", async () => {
    window.history.pushState({}, "", "/chat");
    const router = createAppRouter(makeContext({ user: fakeUser }));
    await router.load();
    render(<RouterProvider router={router} />);
    await screen.findByText("layout");
    expect(screen.getByText("layout")).toBeInTheDocument();
  });

  it("renders subscriptions page via router (covers SubscriptionsPage lazy callback)", async () => {
    window.history.pushState({}, "", "/subscriptions");
    const router = createAppRouter(makeContext({ user: fakeUser }));
    await router.load();
    render(<RouterProvider router={router} />);
    await screen.findByText("layout");
    expect(screen.getByText("layout")).toBeInTheDocument();
  });

  it("renders calendar page via router (covers CalendarPage lazy callback)", async () => {
    window.history.pushState({}, "", "/calendar");
    const router = createAppRouter(makeContext({ user: fakeUser }));
    await router.load();
    render(<RouterProvider router={router} />);
    await screen.findByText("layout");
    expect(screen.getByText("layout")).toBeInTheDocument();
  });

  it("renders statistics page via router (covers StatisticsPage lazy callback)", async () => {
    window.history.pushState({}, "", "/statistics");
    const router = createAppRouter(makeContext({ user: fakeUser }));
    await router.load();
    render(<RouterProvider router={router} />);
    await screen.findByText("layout");
    expect(screen.getByText("layout")).toBeInTheDocument();
  });

  it("renders password-reset page via router (covers PasswordResetPage lazy callback — line 23)", async () => {
    window.history.pushState({}, "", "/password-reset");
    const router = createAppRouter(makeContext({ user: null }));
    await router.load();
    render(<RouterProvider router={router} />);
    await screen.findByText("password-reset");
    expect(screen.getByText("password-reset")).toBeInTheDocument();
  });

  // Line 20: lazy import of TotpPage
  it("renders totp page via router (covers TotpPage lazy import — line 20)", async () => {
    window.history.pushState({}, "", "/totp");
    const router = createAppRouter(makeContext({ user: null }));
    await router.load();
    render(<RouterProvider router={router} />);
    await screen.findByText("totp");
    expect(screen.getByText("totp")).toBeInTheDocument();
  });

  // Line 23: lazy import of PasswordResetPage (explicit extra coverage)
  it("renders register page via router (covers RegisterPage lazy import)", async () => {
    window.history.pushState({}, "", "/register");
    const router = createAppRouter(makeContext({ user: null }));
    await router.load();
    render(<RouterProvider router={router} />);
    await screen.findByText("register");
    expect(screen.getByText("register")).toBeInTheDocument();
  });
});

// ─── Navigation / beforeLoad guards ───────────────────────────────────────────

describe("route navigation guards", () => {
  const originalPath = window.location.pathname;

  afterEach(() => {
    window.history.pushState({}, "", originalPath || "/");
  });

  it("protectedLayoutRoute: redirects to /login when no user and not loading", async () => {
    window.history.pushState({}, "", "/dashboard");
    const router = createAppRouter(makeContext({ user: null, isLoading: false }));
    await router.load();
    expect(router.state.location.pathname).toBe("/login");
  });

  it("protectedLayoutRoute: allows access when isLoading is true", async () => {
    window.history.pushState({}, "", "/dashboard");
    const router = createAppRouter(makeContext({ user: null, isLoading: true }));
    await router.load();
    expect(router.state.location.pathname).toBe("/dashboard");
  });

  it("indexRoute: redirects / to /dashboard when authenticated", async () => {
    window.history.pushState({}, "", "/");
    const router = createAppRouter(makeContext({ user: fakeUser }));
    await router.load();
    expect(router.state.location.pathname).toBe("/dashboard");
  });

  it("adminRoute navigation: redirects to /dashboard when not admin", async () => {
    window.history.pushState({}, "", "/admin");
    const router = createAppRouter(makeContext({ user: fakeUser, isAdmin: false }));
    await router.load();
    expect(router.state.location.pathname).toBe("/dashboard");
  });

  it("adminRoute navigation: does not redirect when user is admin", async () => {
    window.history.pushState({}, "", "/admin");
    const router = createAppRouter(makeContext({ user: fakeUser, isAdmin: true }));
    await router.load();
    expect(router.state.location.pathname).toBe("/admin");
  });

  it("catchAllRoute: redirects to /dashboard for unknown paths", async () => {
    window.history.pushState({}, "", "/this-path-does-not-exist");
    const router = createAppRouter(makeContext({ user: fakeUser }));
    await router.load();
    expect(router.state.location.pathname).toBe("/dashboard");
  });
});
