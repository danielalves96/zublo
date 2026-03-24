import { fireEvent, render, screen } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  isAdmin: true,
  navigate: vi.fn(),
  useSearch: vi.fn(() => ({ tab: "oidc" })),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, fallback?: string) => fallback ?? key,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    isAdmin: mocks.isAdmin,
  }),
}));

vi.mock("@/routes", () => ({
  adminRoute: {
    useSearch: mocks.useSearch,
  },
}));

vi.mock("@/components/admin/adminPage.config", () => ({
  ADMIN_TAB_COMPONENTS: {
    users: () => <div>Users Tab</div>,
    oidc: () => <div>OIDC Tab</div>,
  },
  getAdminPageMenuItems: () => [
    { value: "users", label: "Users" },
    { value: "oidc", label: "OIDC" },
  ],
}));

vi.mock("@/components/ui/SidebarTabsLayout", () => ({
  SidebarTabsLayout: ({
    title,
    items,
    activeValue,
    onValueChange,
    children,
  }: {
    title: string;
    items: Array<{ value: string; label: string }>;
    activeValue: string;
    onValueChange: (value: "users" | "oidc") => void;
    children: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      <div data-testid="active-tab">{activeValue}</div>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onValueChange(item.value as "users" | "oidc")}
        >
          {item.label}
        </button>
      ))}
      {children}
    </div>
  ),
}));

import { AdminPage } from "./AdminPage";

describe("AdminPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAdmin = true;
    mocks.useSearch.mockReturnValue({ tab: "oidc" });
  });

  it("renders the permission guard for non-admin users", () => {
    mocks.isAdmin = false;

    render(<AdminPage />);

    expect(screen.getByText("no_permission")).toBeInTheDocument();
    expect(screen.queryByText("OIDC Tab")).not.toBeInTheDocument();
  });

  it("renders the selected admin tab and navigates when tabs change", () => {
    render(<AdminPage />);

    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByTestId("active-tab")).toHaveTextContent("oidc");
    expect(screen.getByText("OIDC Tab")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Users" }));

    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/admin",
      search: { tab: "users" },
      replace: true,
    });
  });

  it("defaults to users tab when search.tab is undefined or invalid", () => {
    // 1. undefined tab
    mocks.useSearch.mockReturnValue({} as any);
    const { rerender } = render(<AdminPage />);
    expect(screen.getByTestId("active-tab")).toHaveTextContent("users");
    expect(screen.getByText("Users Tab")).toBeInTheDocument();

    // 2. invalid tab
    mocks.useSearch.mockReturnValue({ tab: "invalid_tab" });
    rerender(<AdminPage />);
    expect(screen.getByTestId("active-tab")).toHaveTextContent("invalid_tab");
    expect(screen.getByText("Users Tab")).toBeInTheDocument();
  });
});
