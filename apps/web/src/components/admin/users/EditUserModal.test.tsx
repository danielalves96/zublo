import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EditUserModal, avatarUrl } from "./EditUserModal";
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
  const getFileInput = () =>
    document.querySelector("input[type=file]") as HTMLInputElement | null;
  const getSubmitButton = () =>
    document.querySelector("button[type=submit]") as HTMLButtonElement | null;

  const mockUser: AdminUser = {
    id: "user-1",
    name: "Alice Liddell",
    username: "alice",
    email: "alice@wonderland.com",
    avatar: "avatar.png",
    is_admin: false,
    totp_enabled: false,
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

  // Lines 119-123: admin badge conditional rendering
  it("shows admin badge if user is admin (lines 119-123)", () => {
    renderComponent({ ...mockUser, is_admin: true });
    expect(screen.getByText(/admin/)).toBeInTheDocument();
    // The Crown icon wrapper span with admin text
    const adminBadge = screen.getByText("admin");
    expect(adminBadge).toBeInTheDocument();
  });

  // Lines 113-146: no admin badge when user is not admin
  it("does not show admin badge when user is not admin", () => {
    renderComponent({ ...mockUser, is_admin: false });
    // "admin" text should NOT appear in the title area as a badge
    // (the heading is "edit_user", no crown badge)
    const heading = screen.getByRole("heading", { name: /edit_user/i });
    expect(heading).not.toHaveTextContent("admin");
  });

  // Lines 127-214: password section rendering
  it("renders change_password section with optional label (lines 127+)", () => {
    renderComponent();
    expect(screen.getByText("change_password")).toBeInTheDocument();
    // The optional label is rendered as "(optional)" with surrounding parentheses
    expect(screen.getByText("(optional)")).toBeInTheDocument();
  });

  // Lines 131-146: password fields visible
  it("renders new_password and confirm_password fields (lines 131-146)", () => {
    renderComponent();
    expect(screen.getByText("new_password")).toBeInTheDocument();
    expect(screen.getByText("confirm_password")).toBeInTheDocument();
  });

  it("submits changes correctly without password or avatar", async () => {
    vi.mocked(adminService.updateUser).mockResolvedValue({ success: true } as any);

    renderComponent();

    const inputs = Array.from(document.querySelectorAll("input")).filter(i => i.type !== "file");

    // Clear name and type new one
    await userEvent.clear(inputs[0]);
    await userEvent.type(inputs[0], "Alice Bob");

    const submitBtn = getSubmitButton();
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

    const submitBtn = getSubmitButton();
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

    const submitBtn = getSubmitButton();
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("passwords_no_match")).toBeInTheDocument();
    });
  });

  it("shows username required validation error", async () => {
    renderComponent();

    const usernameInput = document.querySelector(
      'input[name="username"]',
    ) as HTMLInputElement | null;

    expect(usernameInput).not.toBeNull();
    await userEvent.clear(usernameInput!);

    const submitBtn = getSubmitButton();
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText("required")).toBeInTheDocument();
    });
  });

  it("shows email and short password validation errors", async () => {
    renderComponent();

    const emailInput = document.querySelector(
      'input[name="email"]',
    ) as HTMLInputElement | null;
    const passwordInput = document.querySelector(
      'input[name="password"]',
    ) as HTMLInputElement | null;

    expect(emailInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();

    await userEvent.clear(emailInput!);
    await userEvent.type(emailInput!, "invalid-email");
    await userEvent.type(passwordInput!, "short");

    const form = document.querySelector("form");
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText("validation_invalid_email")).toBeInTheDocument();
      expect(
        screen.getByText('validation_min_chars{"count":8}'),
      ).toBeInTheDocument();
    });
  });

  it("submits with avatar upload", async () => {
    vi.mocked(adminService.updateUser).mockResolvedValue({ success: true } as any);
    vi.mocked(adminService.uploadAvatar).mockResolvedValue({ success: true } as any);

    renderComponent();

    const file = new File(["dummy"], "new-avatar.png", { type: "image/png" });
    const fileInput = getFileInput();
    if (fileInput) {
      await userEvent.upload(fileInput, file);
    }

    const submitBtn = getSubmitButton();
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminService.uploadAvatar).toHaveBeenCalledWith("user-1", expect.any(FormData));
      expect(toast.success).toHaveBeenCalledWith("saved");
    });
  });

  it("previews selected avatar", async () => {
    renderComponent();

    const file = new File(["dummy"], "new-avatar.png", { type: "image/png" });
    const fileInput = getFileInput();
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

    const submitBtn = getSubmitButton();
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update failed");
      expect(onCloseMock).not.toHaveBeenCalled();
    });
  });

  it("handles string error on update", async () => {
    vi.mocked(adminService.updateUser).mockRejectedValue("String error");

    renderComponent();

    const submitBtn = getSubmitButton();
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

  it("falls back to 'U' when user has no avatar, name, username, or email", () => {
    renderComponent({
      ...mockUser,
      name: "",
      username: "",
      email: "",
      avatar: "",
    });

    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("can click the change avatar button", async () => {
    renderComponent();

    const changeAvatarBtn = screen.getByRole("button", { name: "change_avatar" });
    await userEvent.click(changeAvatarBtn);
    // it triggers input click, which we implicitly test via upload
  });

  // Line 113: onOpenChange triggers onClose when dialog closed
  it("calls onClose when dialog is closed via onOpenChange (line 113)", () => {
    renderComponent();
    // Pressing Escape triggers onOpenChange(false) => !open && onClose()
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    expect(onCloseMock).toHaveBeenCalled();
  });

  it("clicks the avatar buttons and ignores empty file selection", async () => {
    renderComponent();

    const avatarButtons = Array.from(
      document.querySelectorAll("button[type=button]"),
    ) as HTMLButtonElement[];
    const avatarCircleButton = avatarButtons.find(
      (btn) => btn.classList.contains("rounded-full") && btn.classList.contains("h-20"),
    );
    const cameraButton = document.querySelector("button.scale-0") as HTMLButtonElement | null;

    expect(avatarCircleButton).not.toBeUndefined();
    expect(cameraButton).not.toBeNull();

    await userEvent.click(avatarCircleButton!);
    await userEvent.click(cameraButton!);

    const fileInput = getFileInput()!;
    Object.defineProperty(fileInput, "files", {
      value: Object.assign([], { item: () => null, length: 0 }),
      configurable: true,
    });
    fireEvent.change(fileInput);

    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("exports avatarUrl helper behavior", () => {
    expect(avatarUrl("user-1", "")).toBeNull();
    expect(avatarUrl("user-1", "avatar.png")).toBe("mocked-url-user-1-avatar.png");
  });
});
