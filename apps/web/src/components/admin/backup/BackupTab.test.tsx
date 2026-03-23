import { render, screen } from "@testing-library/react";

import { BackupTab } from "./BackupTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/services/admin", () => ({
  adminService: {
    backupRaw: vi.fn(),
    restore: vi.fn(),
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("BackupTab", () => {
  it("renders backup heading and buttons", () => {
    render(<BackupTab />);
    expect(screen.getByText("backup_description")).toBeInTheDocument();
    expect(screen.getAllByText("download_backup").length).toBeGreaterThanOrEqual(1);
  });

  it("renders restore section", () => {
    render(<BackupTab />);
    expect(screen.getByText("restore_from_backup")).toBeInTheDocument();
  });
});
