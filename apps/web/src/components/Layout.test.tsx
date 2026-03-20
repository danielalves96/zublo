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
});
