import { render, screen } from "@testing-library/react";

import { RegistrationTab } from "./RegistrationTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: {
      id: "s1",
      open_registrations: true,
      require_email_validation: false,
      disable_login: false,
      update_notification: true,
      max_users: 100,
      server_url: "https://app.example.com",
    },
  }),
  useMutation: () => ({ mutate: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/services/admin", () => ({
  adminService: { getSettings: vi.fn(), updateSettings: vi.fn() },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { admin: { settings: () => ["admin", "settings"] } },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("RegistrationTab", () => {
  it("renders heading", () => {
    render(<RegistrationTab />);
    expect(screen.getByText("registration")).toBeInTheDocument();
  });

  it("renders toggle labels", () => {
    render(<RegistrationTab />);
    expect(screen.getByText("open_registrations")).toBeInTheDocument();
    expect(screen.getByText("require_email_validation")).toBeInTheDocument();
    expect(screen.getByText("disable_login")).toBeInTheDocument();
    expect(screen.getByText("update_notifications")).toBeInTheDocument();
  });

  it("renders limits section", () => {
    render(<RegistrationTab />);
    expect(screen.getByText("max_users")).toBeInTheDocument();
    expect(screen.getByText("server_url")).toBeInTheDocument();
  });
});
