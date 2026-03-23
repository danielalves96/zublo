import { render, screen } from "@testing-library/react";

import { MaintenanceTab } from "./MaintenanceTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/services/admin", () => ({
  adminService: { deleteUnusedLogos: vi.fn() },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("MaintenanceTab", () => {
  it("renders heading", () => {
    render(<MaintenanceTab />);
    expect(screen.getByText("maintenance")).toBeInTheDocument();
  });

  it("renders cleanup button", () => {
    render(<MaintenanceTab />);
    expect(screen.getAllByText("cleanup_logos").length).toBeGreaterThanOrEqual(1);
  });
});
