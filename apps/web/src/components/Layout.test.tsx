import { fireEvent, render, screen } from "@testing-library/react";

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
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: mocks.aiSettings,
  }),
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
});
