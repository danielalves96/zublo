import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CronjobsTab } from "./CronjobsTab";
import { adminService } from "@/services/admin";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string) => k,
  }),
}));

vi.mock("@/services/admin", () => ({
  adminService: {
    runCron: vi.fn(),
  },
}));

describe("CronjobsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    render(<CronjobsTab />);
    
    expect(screen.getByText("cronjobs_desc")).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: "run" });
    expect(buttons).toHaveLength(5);
  });

  it("handles successful run", async () => {
    vi.mocked(adminService.runCron).mockResolvedValue({} as any);
    
    render(<CronjobsTab />);
    
    // Get all run buttons
    const buttons = screen.getAllByRole("button", { name: "run" });
    
    // Click the first one (check_subscriptions)
    fireEvent.click(buttons[0]);
    
    // Button should change to "running"
    expect(screen.getByRole("button", { name: "running" })).toBeInTheDocument();
    
    await waitFor(() => {
      expect(adminService.runCron).toHaveBeenCalledWith("check_subscriptions");
    });
    
    // Wait for "Done." output to appear in textarea
    await waitFor(() => {
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("Done.");
    });
    
    // Button should be back to "run"
    expect(screen.queryByRole("button", { name: "running" })).not.toBeInTheDocument();
  });

  it("handles error run (Error instance)", async () => {
    vi.mocked(adminService.runCron).mockRejectedValue(new Error("Test error"));
    
    render(<CronjobsTab />);
    
    const buttons = screen.getAllByRole("button", { name: "run" });
    fireEvent.click(buttons[1]); // send_notifications
    
    await waitFor(() => {
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("Error: Test error");
    });
  });

  it("handles error run (string error)", async () => {
    vi.mocked(adminService.runCron).mockRejectedValue("String error");
    
    render(<CronjobsTab />);
    
    const buttons = screen.getAllByRole("button", { name: "run" });
    fireEvent.click(buttons[2]); // update_exchange_rates
    
    await waitFor(() => {
      const textarea = screen.getByRole("textbox");
      expect(textarea).toHaveValue("Error: String error");
    });
  });
});
