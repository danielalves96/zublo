import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BackupTab } from "./BackupTab";
import { toast } from "@/lib/toast";
import { adminService } from "@/services/admin";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/services/admin", () => ({
  adminService: {
    backupRaw: vi.fn(),
    restore: vi.fn(),
  },
}));

describe("BackupTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    render(<BackupTab />);
    expect(screen.getByText("backup_description")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "download_backup" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "restore_from_backup" })).toBeInTheDocument();
  });

  describe("Download", () => {
    it("handles download success", async () => {
      const mockBlob = new Blob(["test"], { type: "application/octet-stream" });
      const mockResponse = {
        ok: true,
        blob: vi.fn().mockResolvedValue(mockBlob),
      } as unknown as Response;
      
      vi.mocked(adminService.backupRaw).mockResolvedValue(mockResponse);

      const createObjectURL = vi.fn().mockReturnValue("blob:test-url");
      const revokeObjectURL = vi.fn();
      window.URL.createObjectURL = createObjectURL;
      window.URL.revokeObjectURL = revokeObjectURL;

      const clickMock = vi.fn();
      const mockAnchor = {
        href: "",
        download: "",
        click: clickMock,
      };
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag) => {
        if (tag === "a") return mockAnchor as any;
        return originalCreateElement(tag);
      });

      render(<BackupTab />);
      fireEvent.click(screen.getByRole("button", { name: "download_backup" }));

      await waitFor(() => {
        expect(adminService.backupRaw).toHaveBeenCalled();
      });

      expect(mockResponse.blob).toHaveBeenCalled();
      expect(createObjectURL).toHaveBeenCalledWith(mockBlob);
      expect(mockAnchor.href).toBe("blob:test-url");
      expect(mockAnchor.download).toMatch(/zublo-backup-\d{4}-\d{2}-\d{2}\.db/);
      expect(clickMock).toHaveBeenCalled();
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:test-url");
    });

    it("handles download error", async () => {
      vi.mocked(adminService.backupRaw).mockResolvedValue({
        ok: false,
      } as Response);

      render(<BackupTab />);
      fireEvent.click(screen.getByRole("button", { name: "download_backup" }));

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("error");
      });
    });
  });

  describe("Restore", () => {
    it("handles restore button click and file input change success", async () => {
      vi.mocked(adminService.restore).mockResolvedValue({} as any);

      render(<BackupTab />);
      
      // We know there is an invisible input[type="file"] next to the button
      // But we can just use the button to click the input, though in RTL it's easier to fire change on the input directly.
      const button = screen.getByRole("button", { name: "restore_from_backup" });
      fireEvent.click(button); // Trigger click on input
      
      // Let's find the hidden file input
      // In RTL, we can find it by its testid if added, or by its type
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeInTheDocument();

      const file = new File(["dummy content"], "test.db", { type: "application/x-sqlite3" });
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(adminService.restore).toHaveBeenCalled();
      });

      const calledWithFormData = vi.mocked(adminService.restore).mock.calls[0][0] as FormData;
      expect(calledWithFormData.get("file")).toBe(file);

      expect(toast.success).toHaveBeenCalledWith("restore_success");
    });

    it("handles restore error", async () => {
      vi.mocked(adminService.restore).mockRejectedValue(new Error("Network error"));

      render(<BackupTab />);
      
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      const file = new File(["dummy content"], "test.db", { type: "application/x-sqlite3" });
      fireEvent.change(input, { target: { files: [file] } });

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith("error");
      });
    });
    
    it("does nothing if no file is selected", async () => {
      render(<BackupTab />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(input, { target: { files: [] } });
      
      expect(adminService.restore).not.toHaveBeenCalled();
    });
  });
});
