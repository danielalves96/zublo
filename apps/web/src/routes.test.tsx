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

vi.mock("@/components/Layout", () => ({
  Layout: () => null,
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
    const result = settingsRoute.options.validateSearch?.({ tab: "general" });
    expect(result).toEqual({ tab: "general" });
  });

  it("returns undefined tab when search.tab is not a string", () => {
    const result = settingsRoute.options.validateSearch?.({ tab: 42 });
    expect(result).toEqual({ tab: undefined });
  });

  it("returns undefined tab when search.tab is absent", () => {
    const result = settingsRoute.options.validateSearch?.({});
    expect(result).toEqual({ tab: undefined });
  });
});

// ─── adminRoute.validateSearch ────────────────────────────────────────────────

describe("adminRoute.validateSearch", () => {
  it("returns tab when search.tab is a string", () => {
    const result = adminRoute.options.validateSearch?.({ tab: "users" });
    expect(result).toEqual({ tab: "users" });
  });

  it("returns undefined tab when search.tab is not a string", () => {
    const result = adminRoute.options.validateSearch?.({ tab: null });
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
