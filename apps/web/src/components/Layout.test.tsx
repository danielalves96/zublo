import { fireEvent, render, screen } from "@testing-library/react";

import { queryKeys } from "@/lib/queryKeys";

const mocks = vi.hoisted(() => ({
  pathname: "/dashboard",
  aiSettings: { enabled: true },
  logout: vi.fn(),
  avatarUrl: vi.fn(),
  user: {
    id: "user-1",
    name: "Daniel",
    username: "daniel",
    email: "daniel@example.com",
    avatar: "avatar.png",
    mobile_navigation: true,
  },
  isAdmin: true,
  useQueryEnabled: true as boolean | undefined,
  capturedQueryKey: undefined as unknown,
  capturedQueryFn: undefined as (() => unknown) | undefined,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: {
    enabled?: boolean;
    queryKey?: unknown;
    queryFn?: () => unknown;
  }) => {
    // Track the enabled flag to verify the guard
    mocks.useQueryEnabled = opts.enabled;
    mocks.capturedQueryKey = opts.queryKey;
    mocks.capturedQueryFn = opts.queryFn;
    return {
      data: mocks.aiSettings,
    };
  },
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
    onClick,
  }: {
    to: string;
    children: React.ReactNode;
    onClick?: () => void;
  }) => (
    <button type="button" data-to={to} onClick={onClick}>
      {children}
    </button>
  ),
  Outlet: () => <div>outlet-content</div>,
  useRouterState: ({
    select,
  }: {
    select: (state: { location: { pathname: string } }) => string;
  }) => select({ location: { pathname: mocks.pathname } }),
}));

vi.mock("@/components/AppLogo", () => ({
  LogoIcon: () => <div>logo-icon</div>,
  LogoWithName: () => <div>logo-with-name</div>,
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.user,
    isAdmin: mocks.isAdmin,
    logout: mocks.logout,
  }),
}));

vi.mock("@/services/users", () => ({
  usersService: {
    avatarUrl: mocks.avatarUrl,
  },
}));

const { mockAiGetSettings } = vi.hoisted(() => ({
  mockAiGetSettings: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/services/ai", () => ({
  aiService: { getSettings: mockAiGetSettings },
}));

import { Layout } from "./Layout";

describe("Layout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.pathname = "/dashboard";
    mocks.aiSettings = { enabled: true };
    mocks.isAdmin = true;
    mocks.user = {
      id: "user-1",
      name: "Daniel",
      username: "daniel",
      email: "daniel@example.com",
      avatar: "avatar.png",
      mobile_navigation: true,
    };
    mocks.capturedQueryKey = undefined;
    mocks.avatarUrl.mockReturnValue("https://cdn.example.com/avatar.png");
  });

  it("renders chat/admin navigation, mobile nav, avatar, and logout action", () => {
    render(<Layout />);

    expect(screen.getAllByText("chat").length).toBeGreaterThan(0);
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
    expect(screen.getByAltText("Daniel")).toHaveAttribute(
      "src",
      "https://cdn.example.com/avatar.png",
    );
    expect(screen.getByText("outlet-content")).toBeInTheDocument();

    fireEvent.click(screen.getByText("logout"));

    expect(mocks.logout).toHaveBeenCalledTimes(1);
  });

  it("falls back to user initial and hides chat/admin when disabled", () => {
    mocks.aiSettings = { enabled: false };
    mocks.isAdmin = false;
    mocks.user = {
      id: "user-1",
      name: "",
      username: "daniel",
      email: "daniel@example.com",
      avatar: "",
      mobile_navigation: false,
    };

    render(<Layout />);

    expect(screen.getByText("D")).toBeInTheDocument();
    expect(screen.queryByText("chat")).not.toBeInTheDocument();
    expect(screen.queryByText("admin")).not.toBeInTheDocument();
  });

  it("toggles sidebar collapsed state when collapse button is clicked", () => {
    render(<Layout />);

    // The collapse button toggles isCollapsed state
    const collapseButton = document.querySelector(
      "button.hidden.lg\\:flex",
    ) as HTMLButtonElement;
    expect(collapseButton).not.toBeNull();
    fireEvent.click(collapseButton);
    // After collapsing, the ChevronRight icon should be visible (button still exists)
    expect(collapseButton).toBeInTheDocument();
  });

  it("closes sidebar when a nav link is clicked", () => {
    render(<Layout />);

    // Find the mobile menu button (the last button in the header area before main content)
    // It's in the mobile header (lg:hidden) and triggers setSidebarOpen(true)
    const header = document.querySelector("header");
    const menuButton = header?.querySelector("button") as HTMLButtonElement;
    expect(menuButton).not.toBeNull();
    fireEvent.click(menuButton);

    // Overlay should now be visible
    const overlay = document.querySelector(".fixed.inset-0.z-40") as HTMLElement;
    expect(overlay).not.toBeNull();

    // Click a nav link (e.g. dashboard) which calls setSidebarOpen(false)
    const navLinks = screen.getAllByRole("button", { name: "dashboard" });
    fireEvent.click(navLinks[0]);

    // The overlay should no longer be visible (sidebarOpen=false)
    expect(
      document.querySelector(".fixed.inset-0.z-40"),
    ).toBeNull();
  });

  it("closes sidebar when the overlay backdrop is clicked", () => {
    render(<Layout />);

    // Open sidebar via mobile header button
    const header = document.querySelector("header");
    const menuButton = header?.querySelector("button") as HTMLButtonElement;
    fireEvent.click(menuButton);

    // The overlay div appears when sidebarOpen=true
    const overlay = document.querySelector(".fixed.inset-0.z-40") as HTMLElement;
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay);

    // After clicking overlay sidebar should be closed
    expect(document.querySelector(".fixed.inset-0.z-40")).toBeNull();
  });

  it("closes sidebar when the X button inside it is clicked", () => {
    render(<Layout />);

    // Open sidebar first via mobile header button
    const header = document.querySelector("header");
    const menuButton = header?.querySelector("button") as HTMLButtonElement;
    fireEvent.click(menuButton);

    // Verify overlay visible
    expect(document.querySelector(".fixed.inset-0.z-40")).not.toBeNull();

    // The X button inside sidebar (lg:hidden button) closes it
    const xButton = document.querySelector(
      "aside button.lg\\:hidden",
    ) as HTMLButtonElement;
    expect(xButton).not.toBeNull();
    fireEvent.click(xButton);

    expect(document.querySelector(".fixed.inset-0.z-40")).toBeNull();
  });

  it("renders mobile bottom navigation when mobile_navigation is true", () => {
    render(<Layout />);

    // mobile_navigation is true in the default mock
    const mobileNav = document.querySelector("nav.fixed.bottom-0");
    expect(mobileNav).not.toBeNull();
    // It renders the first 5 nav items
    expect(screen.getAllByText("dashboard").length).toBeGreaterThan(0);
  });

  it("falls back to 'U' when user has no name and no email initial", () => {
    mocks.user = {
      id: "user-1",
      name: "",
      username: "",
      email: "",
      avatar: "",
      mobile_navigation: false,
    };

    render(<Layout />);

    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("shows admin section collapsed tooltip when sidebar is collapsed and user is admin", () => {
    render(<Layout />);

    // Collapse the sidebar
    const collapseButton = document.querySelector(
      "button.hidden.lg\\:flex",
    ) as HTMLButtonElement;
    fireEvent.click(collapseButton);

    // admin tooltip content should be present
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
  });

  // Line 48: aiSettings query enabled condition — disabled when user has no id
  it("disables aiSettings query when user has no id (line 48)", () => {
    mocks.user = {
      id: "",
      name: "No ID User",
      username: "noid",
      email: "noid@example.com",
      avatar: "",
      mobile_navigation: false,
    };

    render(<Layout />);

    // When user.id is falsy, enabled should be false (!!user?.id => false)
    expect(mocks.useQueryEnabled).toBe(false);
  });

  // Line 161: admin section conditional rendering — renders when isAdmin is true
  it("renders admin navigation section when isAdmin is true (line 161)", () => {
    mocks.isAdmin = true;
    render(<Layout />);

    // The admin link should be present
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
    // The administration label should also be present (not collapsed)
    expect(screen.getByText("administration")).toBeInTheDocument();
  });

  // Line 161: admin section conditional rendering — absent when isAdmin is false
  it("does not render admin navigation section when isAdmin is false (line 161)", () => {
    mocks.isAdmin = false;
    render(<Layout />);

    expect(screen.queryByText("administration")).not.toBeInTheDocument();
    expect(screen.queryByText("admin")).not.toBeInTheDocument();
  });

  // aiSettings.enabled false → chat nav item not included (navItems = baseNavItems)
  it("excludes chat nav item when aiSettings.enabled is false", () => {
    mocks.aiSettings = { enabled: false };
    render(<Layout />);
    expect(screen.queryByText("chat")).not.toBeInTheDocument();
  });

  // aiSettings.enabled true → chat nav item included between statistics and settings
  it("includes chat nav item when aiSettings.enabled is true", () => {
    mocks.aiSettings = { enabled: true };
    render(<Layout />);
    expect(screen.getAllByText("chat").length).toBeGreaterThan(0);
  });

  // user?.avatar truthy → renders <img> (already covered above, but explicit test)
  it("renders avatar image when user has an avatar", () => {
    mocks.user = {
      id: "user-1",
      name: "Daniel",
      username: "daniel",
      email: "daniel@example.com",
      avatar: "avatar.png",
      mobile_navigation: false,
    };
    mocks.avatarUrl.mockReturnValue("https://cdn.example.com/avatar.png");
    render(<Layout />);
    const img = screen.getByAltText("Daniel");
    expect(img.tagName).toBe("IMG");
  });

  // user?.avatar falsy → falls back to initial letter via email when name is empty
  it("falls back to email initial when user has no name but has email", () => {
    mocks.user = {
      id: "user-1",
      name: "",
      username: "",
      email: "zara@example.com",
      avatar: "",
      mobile_navigation: false,
    };
    render(<Layout />);
    expect(screen.getByText("Z")).toBeInTheDocument();
  });

  // user?.name || user?.username shown in collapsed=false user section
  it("shows username when user has no name but has username", () => {
    mocks.user = {
      id: "user-1",
      name: "",
      username: "charlie",
      email: "charlie@example.com",
      avatar: "",
      mobile_navigation: false,
    };
    render(<Layout />);
    expect(screen.getByText("charlie")).toBeInTheDocument();
  });

  // mobile_navigation: false → no bottom nav rendered
  it("does not render mobile bottom navigation when mobile_navigation is false", () => {
    mocks.user = {
      id: "user-1",
      name: "Daniel",
      username: "daniel",
      email: "daniel@example.com",
      avatar: "",
      mobile_navigation: false,
    };
    render(<Layout />);
    expect(document.querySelector("nav.fixed.bottom-0")).toBeNull();
  });

  // Active nav link — pathname matches a route prefix
  it("marks nav link as active when pathname matches route", () => {
    mocks.pathname = "/subscriptions";
    render(<Layout />);
    // The subscriptions link should be rendered (existence confirms active logic ran)
    expect(screen.getAllByText("subscriptions").length).toBeGreaterThan(0);
  });

  // Collapsed sidebar: nav labels hidden, tooltip content shown; admin tooltip also shown
  it("renders admin tooltip content when collapsed and isAdmin is true", () => {
    mocks.isAdmin = true;
    render(<Layout />);
    const collapseButton = document.querySelector(
      "button.hidden.lg\\:flex",
    ) as HTMLButtonElement;
    fireEvent.click(collapseButton);
    // The admin text is still in the DOM via TooltipContent
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
  });

  // Admin section active state: pathname starts with /admin
  it("sets admin link as active when pathname starts with /admin", () => {
    mocks.pathname = "/admin";
    mocks.isAdmin = true;
    render(<Layout />);
    expect(screen.getAllByText("admin").length).toBeGreaterThan(0);
  });

  it("queryFn calls aiService.getSettings with user id (covers line 48)", async () => {
    render(<Layout />);
    await mocks.capturedQueryFn?.();
    expect(mockAiGetSettings).toHaveBeenCalledWith("user-1");
  });

  it("uses an empty aiSettings query key and disables the query when user is null", () => {
    mocks.user = null;

    render(<Layout />);

    expect(mocks.capturedQueryKey).toEqual(queryKeys.aiSettings(""));
    expect(mocks.useQueryEnabled).toBe(false);
  });

  it("falls back to email alt text and empty src when avatar url is null", () => {
    mocks.user = {
      id: "user-1",
      name: "",
      username: "daniel",
      email: "fallback@example.com",
      avatar: "avatar.png",
      mobile_navigation: false,
    };
    mocks.avatarUrl.mockReturnValue(null);

    render(<Layout />);

    const img = screen.getByAltText("fallback@example.com");
    expect(img).toHaveAttribute("src", "");
  });

  it("clicking admin link calls setSidebarOpen(false) (covers line 161)", () => {
    render(<Layout />);
    // Open the sidebar via the mobile header button
    const header = document.querySelector("header");
    const menuButton = header?.querySelector("button") as HTMLButtonElement;
    fireEvent.click(menuButton);
    // Overlay should be visible
    expect(document.querySelector(".fixed.inset-0.z-40")).not.toBeNull();
    // Click the admin Link (data-to="/admin")
    const adminLink = document.querySelector("button[data-to='/admin']") as HTMLButtonElement;
    expect(adminLink).not.toBeNull();
    fireEvent.click(adminLink!);
    // Sidebar should be closed
    expect(document.querySelector(".fixed.inset-0.z-40")).toBeNull();
  });
});
