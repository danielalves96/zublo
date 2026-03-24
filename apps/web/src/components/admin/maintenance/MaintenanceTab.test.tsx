import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { MaintenanceTab } from "./MaintenanceTab";
import { toast } from "@/lib/toast";
import { adminService } from "@/services/admin";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: any) => {
      if (key === "logos_deleted" && options) {
        return `deleted ${options.count} logos`;
      }
      return key;
    },
  }),
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
  },
}));

vi.mock("@/services/admin", () => ({
  adminService: {
    deleteUnusedLogos: vi.fn(),
  },
}));

describe("MaintenanceTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    render(<MaintenanceTab />);
    
    expect(screen.getByText("maintenance")).toBeInTheDocument();
    expect(screen.getByText("maintenance_desc")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "cleanup_logos" })).toBeInTheDocument();
  });

  it("calls cleanupLogos and shows success toast when clicked", async () => {
    vi.mocked(adminService.deleteUnusedLogos).mockResolvedValue({ deleted: 5 });
    
    render(<MaintenanceTab />);
    
    const button = screen.getByRole("button", { name: "cleanup_logos" });
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(adminService.deleteUnusedLogos).toHaveBeenCalled();
    });
    
    expect(toast.success).toHaveBeenCalledWith("deleted 5 logos");
  });
});
