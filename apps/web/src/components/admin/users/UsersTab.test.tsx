import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/toast";
import { adminService } from "@/services/admin";
import { UsersTab } from "./UsersTab";
import type { AdminUser } from "./types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("@/services/admin", () => ({
  adminService: {
    getUsers: vi.fn(),
    deleteUser: vi.fn(),
    avatarUrl: vi.fn((id, avatar) => `mock-url-${id}-${avatar}`),
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockUsers: AdminUser[] = [
  {
    id: "u1",
    name: "Admin User",
    email: "admin@example.com",
    username: "admin",
    avatar: "",
    created: "2024-01-01",
    totp_enabled: false,
    is_admin: true,
  },
  {
    id: "u2",
    name: "Normal User",
    email: "user@example.com",
    username: "user",
    avatar: "",
    created: "2024-01-01",
    totp_enabled: false,
    is_admin: false,
  },
];

describe("UsersTab", () => {
  beforeEach(() => {
    document.body.style.pointerEvents = "";
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: {
        id: "u1",
        email: "admin@example.com",
        username: "admin",
        name: "Admin User",
      },
      login: vi.fn(),
      logout: vi.fn(),
      isLoading: false,
      isAdmin: true,
      refreshUser: vi.fn(),
    });
    vi.mocked(adminService.getUsers).mockResolvedValue(mockUsers);
    vi.mocked(adminService.deleteUser).mockResolvedValue({ success: true } as any);
  });

  const renderComponent = () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
      <QueryClientProvider client={qc}>
        <UsersTab />
      </QueryClientProvider>
    );
  };

  it("renders loading state", () => {
    vi.mocked(adminService.getUsers).mockImplementationOnce(() => new Promise(() => {}));
    const { container } = renderComponent();
    expect(container.querySelectorAll(".animate-pulse").length).toBe(3);
  });

  it("renders correctly and fetches users", async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText("Admin User")).toBeInTheDocument();
      expect(screen.getByText("Normal User")).toBeInTheDocument();
    });
    expect(screen.getByText("users")).toBeInTheDocument();
    expect(screen.getByText("manage_users")).toBeInTheDocument();
  });

  it("opens and closes AddUserModal", async () => {
    renderComponent();
    await screen.findByText("Admin User");

    const addBtn = screen.getByRole("button", { name: /add_user/i });
    await userEvent.click(addBtn);

    await waitFor(() => {
      expect(screen.getAllByText("add_user").length).toBeGreaterThan(1);
    });
    
    const cancelBtn = screen.getByRole("button", { name: "cancel" });
    await userEvent.click(cancelBtn);
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("opens and closes EditUserModal", async () => {
    renderComponent();
    await screen.findByText("Normal User");

    const editBtns = screen.getAllByRole("button").filter(b => b.querySelector("svg.lucide-pencil"));
    fireEvent.click(editBtns[1]);

    await waitFor(() => {
      expect(screen.getByText(/edit_user/i)).toBeInTheDocument();
    });

    const cancelBtn = screen.getByRole("button", { name: "cancel" });
    await userEvent.click(cancelBtn);
  });

  it("handles user deletion flow successfully", async () => {
    renderComponent();
    await screen.findByText("Normal User");

    const deleteBtns = screen.getAllByRole("button").filter(b => b.querySelector("svg.lucide-trash-2"));
    await userEvent.click(deleteBtns[1]);

    await screen.findByText("confirm_delete");

    await waitFor(() => {
      expect(screen.queryAllByRole("button", { name: "delete" }).length).toBeGreaterThan(0);
    });
    
    // In Radix AlertDialog, the confirm button has text "delete"
    // The query finds both the list buttons (title="delete") and the dialog button
    const confirmBtns = screen.queryAllByRole("button", { name: "delete" });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);

    await waitFor(() => {
      expect(adminService.deleteUser).toHaveBeenCalledWith("u2");
      expect(toast.success).toHaveBeenCalledWith("success_delete");
    });
  });

  it("handles user deletion api error", async () => {
    vi.mocked(adminService.deleteUser).mockRejectedValue(new Error("API Error"));
    renderComponent();
    await screen.findByText("Normal User");

    const deleteBtns = screen.getAllByRole("button").filter(b => b.querySelector("svg.lucide-trash-2"));
    await userEvent.click(deleteBtns[1]);

    await screen.findByText("confirm_delete");

    await waitFor(() => {
      expect(screen.queryAllByRole("button", { name: "delete" }).length).toBeGreaterThan(0);
    });
    const confirmBtns = screen.queryAllByRole("button", { name: "delete" });
    fireEvent.click(confirmBtns[confirmBtns.length - 1]);

    await waitFor(() => {
      expect(adminService.deleteUser).toHaveBeenCalledWith("u2");
      expect(toast.error).toHaveBeenCalledWith("API Error");
    });
  });

  it("cancels user deletion", async () => {
    renderComponent();
    await screen.findByText("Normal User");

    const deleteBtns = screen.getAllByRole("button").filter(b => b.querySelector("svg.lucide-trash-2"));
    await userEvent.click(deleteBtns[1]);

    await screen.findByText("confirm_delete");

    await waitFor(() => {
      // Find the cancel button in the dialog
      expect(screen.queryAllByRole("button", { name: "cancel" }).length).toBeGreaterThan(0);
    });
    const cancelBtns = screen.queryAllByRole("button", { name: "cancel" });
    fireEvent.click(cancelBtns[cancelBtns.length - 1]);

    await waitFor(() => {
      expect(screen.queryByText("confirm_delete")).not.toBeInTheDocument();
      expect(adminService.deleteUser).not.toHaveBeenCalled();
    });
  });
  
  it("closes confirm dialog when open is false via onOpenChange", async () => {
    renderComponent();
    await screen.findByText("Normal User");
    
    const deleteBtns = screen.getAllByRole("button").filter(b => b.querySelector("svg.lucide-trash-2"));
    await userEvent.click(deleteBtns[1]);
    
    await screen.findByText("confirm_delete");
    
    await userEvent.keyboard("{Escape}");
    
    await waitFor(() => {
      expect(screen.queryByText("confirm_delete")).not.toBeInTheDocument();
      expect(adminService.deleteUser).not.toHaveBeenCalled();
    });
  });
});
