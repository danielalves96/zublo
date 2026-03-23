import { render, screen } from "@testing-library/react";

import { CronjobsTab } from "./CronjobsTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/services/admin", () => ({
  adminService: { runCron: vi.fn() },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("CronjobsTab", () => {
  it("renders heading", () => {
    render(<CronjobsTab />);
    expect(screen.getByText("cronjobs")).toBeInTheDocument();
  });

  it("renders job buttons", () => {
    render(<CronjobsTab />);
    expect(screen.getByText("check_subscriptions")).toBeInTheDocument();
    expect(screen.getByText("send_notifications")).toBeInTheDocument();
  });
});
