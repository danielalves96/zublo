import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { AddUserModal } from "./AddUserModal";
import { adminService } from "@/services/admin";
import { toast } from "@/lib/toast";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/services/admin", () => ({
  adminService: {
    createUser: vi.fn(),
    uploadAvatar: vi.fn(),
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AddUserModal", () => {
  let queryClient: QueryClient;
  const onCloseMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient();
    URL.createObjectURL = vi.fn(() => "mocked-url");
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <AddUserModal onClose={onCloseMock} />
      </QueryClientProvider>
    );
  };

  it("renders correctly", () => {
    renderComponent();
    expect(screen.getByRole("heading", { name: /add_user/i })).toBeInTheDocument();
  });

  it("shows validation errors on empty submission", async () => {
    renderComponent();
    
    // Dialog is portaled so we should use screen to find the valid button
    // There might be multiple buttons, so we find the one of type submit
    const submitBtn = document.querySelector("button[type=submit]");
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getAllByText("required")).toHaveLength(3); // username, email, passwordConfirm
    });
  });

  it("handles valid submission without avatar", async () => {
    vi.mocked(adminService.createUser).mockResolvedValue({ id: "1" } as any);
    
    renderComponent();
    
    await userEvent.type(document.querySelector("input[name=name]") as Element, "John Doe");
    await userEvent.type(document.querySelector("input[name=username]") as Element, "johndoe");
    await userEvent.type(document.querySelector("input[name=email]") as Element, "john@example.com");
    await userEvent.type(document.querySelector("input[name=password]") as Element, "password123");
    await userEvent.type(document.querySelector("input[name=passwordConfirm]") as Element, "password123");

    const submitBtn = document.querySelector("button[type=submit]");
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminService.createUser).toHaveBeenCalledWith({
        name: "John Doe",
        username: "johndoe",
        email: "john@example.com",
        password: "password123",
        passwordConfirm: "password123",
      });
      expect(toast.success).toHaveBeenCalledWith("user_created");
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it("handles valid submission with avatar", async () => {
    vi.mocked(adminService.createUser).mockResolvedValue({ id: "1" } as any);
    vi.mocked(adminService.uploadAvatar).mockResolvedValue({} as any);

    renderComponent();

    await userEvent.type(document.querySelector("input[name=name]") as Element, "John Doe");
    await userEvent.type(document.querySelector("input[name=username]") as Element, "johndoe");
    await userEvent.type(document.querySelector("input[name=email]") as Element, "john@example.com");
    await userEvent.type(document.querySelector("input[name=password]") as Element, "password123");
    await userEvent.type(document.querySelector("input[name=passwordConfirm]") as Element, "password123");

    // Add avatar
    const file = new File(["dummy"], "avatar.png", { type: "image/png" });
    const fileInput = document.querySelector("input[type=file]");
    if (fileInput) {
      await userEvent.upload(fileInput, file);
    }

    // Submit
    const submitBtn = document.querySelector("button[type=submit]");
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminService.createUser).toHaveBeenCalledWith({
        name: "John Doe",
        username: "johndoe",
        email: "john@example.com",
        password: "password123",
        passwordConfirm: "password123",
      });
      expect(adminService.uploadAvatar).toHaveBeenCalled();
      expect(toast.success).toHaveBeenCalledWith("user_created");
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  it("handles image preview", async () => {
    renderComponent();
    
    const file = new File(["dummy"], "avatar.png", { type: "image/png" });
    const fileInput = document.querySelector("input[type=file]");
    if (fileInput) {
      await userEvent.upload(fileInput, file);
    }
    
    expect(URL.createObjectURL).toHaveBeenCalledWith(file);
    
    // We should see img tag now
    const img = document.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute("src")).toBe("mocked-url");
  });

  it("handles API error", async () => {
    vi.mocked(adminService.createUser).mockRejectedValue(new Error("API Error"));
    
    renderComponent();

    const inputs = Array.from(document.querySelectorAll("input")).filter(i => i.type !== "file");
    
    await userEvent.type(inputs[0] as HTMLElement, "John Doe");
    await userEvent.type(inputs[1] as HTMLElement, "johndoe");
    await userEvent.type(inputs[2] as HTMLElement, "john@example.com");
    await userEvent.type(inputs[3] as HTMLElement, "password123");
    await userEvent.type(inputs[4] as HTMLElement, "password123");

    const submitBtn = document.querySelector("button[type=submit]");
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("API Error");
    });
  });

  it("handles string API error fallback", async () => {
    vi.mocked(adminService.createUser).mockRejectedValue("String Error");
    
    renderComponent();

    await userEvent.type(document.querySelector("input[name=name]") as Element, "John");
    await userEvent.type(document.querySelector("input[name=username]") as Element, "john");
    await userEvent.type(document.querySelector("input[name=email]") as Element, "j@example.com");
    await userEvent.type(document.querySelector("input[name=password]") as Element, "password123");
    await userEvent.type(document.querySelector("input[name=passwordConfirm]") as Element, "password123");

    const submitBtn = document.querySelector("button[type=submit]");
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("error");
    });
  });
});
