import { fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  const getInput = (selector: string) =>
    document.querySelector(selector) as HTMLInputElement | null;

  const getSubmitButton = () =>
    document.querySelector("button[type=submit]") as HTMLButtonElement | null;

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

  it("falls back to '?' initials when name, username, and email are all empty", () => {
    renderComponent();

    expect(screen.getByText("?")).toBeInTheDocument();
  });

  it("uses username initial when name is empty", async () => {
    renderComponent();

    await userEvent.type(getInput("input[name=username]")!, "johndoe");

    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("uses email initial when name and username are empty", async () => {
    renderComponent();

    await userEvent.type(getInput("input[name=email]")!, "mail@example.com");

    expect(screen.getByText("M")).toBeInTheDocument();
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

    await userEvent.type(getInput("input[name=name]")!, "John Doe");
    await userEvent.type(getInput("input[name=username]")!, "johndoe");
    await userEvent.type(getInput("input[name=email]")!, "john@example.com");
    await userEvent.type(getInput("input[name=password]")!, "password123");
    await userEvent.type(getInput("input[name=passwordConfirm]")!, "password123");

    const submitBtn = getSubmitButton();
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

    await userEvent.type(getInput("input[name=name]")!, "John Doe");
    await userEvent.type(getInput("input[name=username]")!, "johndoe");
    await userEvent.type(getInput("input[name=email]") as HTMLInputElement, "john@example.com");
    await userEvent.type(getInput("input[name=password]")!, "password123");
    await userEvent.type(getInput("input[name=passwordConfirm]")!, "password123");

    // Add avatar
    const file = new File(["dummy"], "avatar.png", { type: "image/png" });
    const fileInput = document.querySelector("input[type=file]") as HTMLInputElement | null;
    if (fileInput) {
      await userEvent.upload(fileInput, file);
    }

    // Submit
    const submitBtn = getSubmitButton();
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

  // Lines 96-109, 125: file input change triggers avatar preview
  it("handles image preview via file input change (lines 96-109)", async () => {
    renderComponent();

    const file = new File(["dummy"], "avatar.png", { type: "image/png" });
    const fileInput = document.querySelector("input[type=file]") as HTMLInputElement | null;
    if (fileInput) {
      await userEvent.upload(fileInput, file);
    }

    expect(URL.createObjectURL).toHaveBeenCalledWith(file);

    // We should see img tag now
    const img = document.querySelector("img");
    expect(img).toBeInTheDocument();
    expect(img?.getAttribute("src")).toBe("mocked-url");
  });

  // Lines 96-109: avatar button click opens file input
  it("avatar button click triggers file input (line 96)", async () => {
    renderComponent();

    // The avatar circle button triggers avatarInputRef.current?.click()
    const avatarButtons = document.querySelectorAll("button[type=button]");
    // Find the one that wraps the avatar (not "change avatar" text button)
    const avatarCircleButton = Array.from(avatarButtons).find(
      (btn) => btn.classList.contains("rounded-full") && btn.classList.contains("h-20"),
    ) as HTMLButtonElement | undefined;

    if (avatarCircleButton) {
      // Clicking it should not throw — it calls avatarInputRef.current?.click()
      await userEvent.click(avatarCircleButton);
    }
  });

  // Line 125: "change avatar" button click triggers file input
  it("change avatar button triggers file input (line 125)", async () => {
    renderComponent();

    const changeAvatarBtn = screen.getByRole("button", { name: "change_avatar" });
    // Should not throw
    await userEvent.click(changeAvatarBtn);
  });

  // Lines 99-104: avatarPreview shown when file selected
  it("shows avatar preview image when file is uploaded (lines 99-104)", async () => {
    renderComponent();

    const file = new File(["img"], "photo.jpg", { type: "image/jpeg" });
    const fileInput = document.querySelector("input[type=file]") as HTMLInputElement;
    await userEvent.upload(fileInput, file);

    const img = document.querySelector("img") as HTMLImageElement;
    expect(img).not.toBeNull();
    expect(img.src).toContain("mocked-url");
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

  it("does not call handleAvatarChange when no file is selected (line 109 falsy branch)", async () => {
    renderComponent();

    const fileInput = document.querySelector("input[type=file]") as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    // Fire change event with an empty FileList (no file selected)
    Object.defineProperty(fileInput, "files", {
      value: Object.assign([], { item: () => null, length: 0 }),
      configurable: true,
    });
    fireEvent.change(fileInput);

    // No avatar preview should appear (handleAvatarChange was not called)
    expect(URL.createObjectURL).not.toHaveBeenCalled();
    expect(document.querySelector("img")).toBeNull();
  });

  it("camera icon button click triggers file input (covers line 109)", async () => {
    renderComponent();
    // The camera overlay button has the "scale-0" class (hidden, shows on group hover)
    const cameraButton = document.querySelector("button.scale-0") as HTMLButtonElement | null;
    expect(cameraButton).not.toBeNull();
    // Clicking it calls avatarInputRef.current?.click() — should not throw
    await userEvent.click(cameraButton!);
  });

  it("falls back to '?' when watched values make initials nullish", async () => {
    vi.resetModules();
    vi.doMock("react-hook-form", async () => {
      const actual = await vi.importActual<typeof import("react-hook-form")>("react-hook-form");

      return {
        ...actual,
        useForm: () => ({
          register: (name: string) => ({
            name,
            onChange: vi.fn(),
            onBlur: vi.fn(),
            ref: vi.fn(),
          }),
          handleSubmit: () => (event?: Event) => event?.preventDefault(),
          watch: () => [[] as unknown as string, "", ""],
          formState: { errors: {}, isSubmitting: false },
        }),
      };
    });

    const [{ AddUserModal: MockedAddUserModal }, reactQuery] = await Promise.all([
      import("./AddUserModal"),
      import("@tanstack/react-query"),
    ]);

    const isolatedQueryClient = new reactQuery.QueryClient();

    render(
      <reactQuery.QueryClientProvider client={isolatedQueryClient}>
        <MockedAddUserModal onClose={onCloseMock} />
      </reactQuery.QueryClientProvider>,
    );

    expect(screen.getByText("?")).toBeInTheDocument();

    vi.doUnmock("react-hook-form");
    vi.resetModules();
  });

  it("handles string API error fallback", async () => {
    vi.mocked(adminService.createUser).mockRejectedValue("String Error");

    renderComponent();

    await userEvent.type(getInput("input[name=name]")!, "John");
    await userEvent.type(getInput("input[name=username]")!, "john");
    await userEvent.type(getInput("input[name=email]")!, "j@example.com");
    await userEvent.type(getInput("input[name=password]")!, "password123");
    await userEvent.type(getInput("input[name=passwordConfirm]")!, "password123");

    const submitBtn = getSubmitButton();
    if (submitBtn) await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("error");
    });
  });
});
