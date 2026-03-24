import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EditUserModal } from "./EditUserModal";
import { toast } from "@/lib/toast";
import { adminService } from "@/services/admin";
import type { AdminUser } from "./types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, options?: any) => key + (options ? JSON.stringify(options) : "") }),
}));

vi.mock("@/services/admin", () => ({
  adminService: {
    updateUser: vi.fn(),
    uploadAvatar: vi.fn(),
    avatarUrl: vi.fn().mockImplementation((id, avatar) => `mocked-url-${id}-${avatar}`),
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("EditUserModal", () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onCloseMock = vi.fn();

  const mockUser: AdminUser = {
    id: "user-1",
    name: "Alice Liddell",
    username: "alice",
    email: "alice@wonderland.com",
    avatar: "avatar.png",
    is_admin: 0 as any, // Just casting it for test
    totp_enabled: 0 as any,
    created: "2024-01-01 10:00:00",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.URL.createObjectURL = vi.fn().mockReturnValue("mocked-preview-url");
  });

  const renderComponent = (user = mockUser) => {
    return render(
      <QueryClientProvider client={qc}>
        <EditUserModal user={user} onClose={onCloseMock} />
      </QueryClientProvider>
    );
  };

  it("renders correctly with user data", () => {
    renderComponent();
    
    expect(screen.getByRole("heading", { name: /edit_user/i })).toBeInTheDocument();
    
    // Check initial values
    const inputs = Array.from(document.querySelectorAll("input")).filter(i => i.type !== "file");
    expect((inputs[0] as HTMLInputElement).value).toBe("Alice Liddell");
    expect((inputs[1] as HTMLInputElement).value).toBe("alice");
    expect((inputs[2] as HTMLInputElement).value).toBe("alice@wonderland.com");
    // Password should be empty
    expect((inputs[3] as HTMLInputElement).value).toBe("");
  });

  it("shows admin badge if user is admin", () => {
    renderComponent({ ...mockUser, is_admin: 1 as any }); // or true depending on the casting
    expect(screen.getByText(/admin/)).toBeInTheDocument();
  });

  it("submits changes correctly without password or avatar", async () => {
    vi.mocked(adminService.updateUser).mockResolvedValue({ success: true } as any);
    
    renderComponent();
    
    const inputs = Array.from(document.querySelectorAll("input")).filter(i => i.type !== "file");
    
    // Clear name and type new one
    await userEvent.clear(inputs[0]);
    await userEvent.type(inputs[0], "Alice Bob");
    
    const submitBtn = document.querySelector("button[type=submit]");
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminService.updateUser).toHaveBeenCalledWith("user-1", {
        name: "Alice Bob",
        username: "alice",
        email: "alice@wonderland.com",
      });
      expect(adminService.uploadAvatar).not.toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("saved");
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it("submits password change correctly", async () => {
    vi.mocked(adminService.updateUser).mockResolvedValue({ success: true } as any);
    
    renderComponent();
    
    const inputs = Array.from(document.querySelectorAll("input")).filter(i => i.type !== "file");
    
    await userEvent.type(inputs[3], "newpassword123");
    await userEvent.type(inputs[4], "newpassword123");
    
    const submitBtn = document.querySelector("button[type=submit]");
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminService.updateUser).toHaveBeenCalledWith("user-1", expect.objectContaining({
        password: "newpassword123"
      }));
    });
  });

  it("shows password mismatch error", async () => {
    renderComponent();
    
    const inputs = Array.from(document.querySelectorAll("input")).filter(i => i.type !== "file");
    
    await userEvent.type(inputs[3], "newpassword123");
    await userEvent.type(inputs[4], "mismatched");
    
    const submitBtn = document.querySelector("button[type=submit]");
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("passwords_no_match")).toBeInTheDocument();
    });
  });

  it("submits with avatar upload", async () => {
    vi.mocked(adminService.updateUser).mockResolvedValue({ success: true } as any);
    vi.mocked(adminService.uploadAvatar).mockResolvedValue({ success: true } as any);
    
    renderComponent();
    
    const file = new File(["dummy"], "new-avatar.png", { type: "image/png" });
    const fileInput = document.querySelector("input[type=file]");
    if (fileInput) {
      await userEvent.upload(fileInput, file);
    }

    const submitBtn = document.querySelector("button[type=submit]");
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminService.uploadAvatar).toHaveBeenCalledWith("user-1", expect.any(FormData));
      expect(toast.success).toHaveBeenCalledWith("saved");
    });
  });

  it("previews selected avatar", async () => {
    renderComponent();
    
    const file = new File(["dummy"], "new-avatar.png", { type: "image/png" });
    const fileInput = document.querySelector("input[type=file]");
    if (fileInput) {
      await userEvent.upload(fileInput, file);
    }
    
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    const img = document.querySelector("img");
    expect(img?.getAttribute("src")).toBe("mocked-preview-url");
  });

  it("handles api error on update", async () => {
    vi.mocked(adminService.updateUser).mockRejectedValue(new Error("Update failed"));
    
    renderComponent();
    
    const submitBtn = document.querySelector("button[type=submit]");
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update failed");
      expect(onCloseMock).not.toHaveBeenCalled();
    });
  });

  it("handles string error on update", async () => {
    vi.mocked(adminService.updateUser).mockRejectedValue("String error");
    
    renderComponent();
    
    const submitBtn = document.querySelector("button[type=submit]");
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("error");
    });
  });

  it("closes when cancel or close button is clicked", async () => {
    renderComponent();
    
    const cancelBtn = screen.getByRole("button", { name: "cancel" });
    await userEvent.click(cancelBtn);
    
    expect(onCloseMock).toHaveBeenCalled();
  });
  
  it("renders with initials avatar if user has no avatar", () => {
    renderComponent({ ...mockUser, avatar: "" });
    // should display initials (displayName -> Alice Liddell -> A)
    expect(screen.getByText("A")).toBeInTheDocument();
  });
  
  it("can click the change avatar button", async () => {
    renderComponent();
    
    const changeAvatarBtn = screen.getByRole("button", { name: "change_avatar" });
    await userEvent.click(changeAvatarBtn);
    // it triggers input click, which we implicitly test via upload
  });
});
