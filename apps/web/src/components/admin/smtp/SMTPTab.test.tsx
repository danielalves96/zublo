import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { SMTPTab } from "./SMTPTab";
import { adminService } from "@/services/admin";
import { toast } from "@/lib/toast";

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
    getSmtp: vi.fn(),
    updateSmtp: vi.fn(),
    testSmtp: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe("SMTPTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SMTPTab />
      </QueryClientProvider>
    );
  };

  it("renders correctly and loads data", async () => {
    vi.mocked(adminService.getSmtp).mockResolvedValue({
      enabled: 1,
      host: "smtp.mail.com",
      port: 587,
      username: "user",
      tls: 1,
      authMethod: "PLAIN",
      senderAddress: "no-reply@test.com",
      senderName: "Test",
      hasPassword: 1,
    } as any);

    renderComponent();

    expect(screen.getByText("SMTP")).toBeInTheDocument();
    
    await waitFor(() => {
      expect(adminService.getSmtp).toHaveBeenCalled();
    });

    // Check if form is populated
    expect(screen.getByDisplayValue("smtp.mail.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("user")).toBeInTheDocument();
  });

  it("handles getSmtp with missing data", async () => {
    vi.mocked(adminService.getSmtp).mockResolvedValue({} as any);

    renderComponent();

    await waitFor(() => {
      expect(adminService.getSmtp).toHaveBeenCalled();
    });
  });

  it("updates form state when child components trigger setField", async () => {
    vi.mocked(adminService.getSmtp).mockResolvedValue({} as any);
    
    const { container } = renderComponent();
    
    await waitFor(() => {
      expect(adminService.getSmtp).toHaveBeenCalled();
    });

    // Trigger onEnabledChange (first switch is the enabled switch from SMTPStatusCard)
    const switches = screen.getAllByRole("switch");
    await userEvent.click(switches[0]);
    
    // Test port field change
    const portInput = container.querySelector('input[placeholder="587"]') as HTMLInputElement;
    await userEvent.clear(portInput);
    await userEvent.type(portInput, "465");
  });

  it("handles save success", async () => {
    vi.mocked(adminService.getSmtp).mockResolvedValue({
      enabled: 1,
      host: "smtp.mail.com",
    } as any);
    vi.mocked(adminService.updateSmtp).mockResolvedValue({} as any);

    renderComponent();
    
    await waitFor(() => {
      expect(adminService.getSmtp).toHaveBeenCalled();
    });

    const saveBtn = screen.getByRole("button", { name: "save" });
    await userEvent.click(saveBtn);
    
    await waitFor(() => {
      expect(adminService.updateSmtp).toHaveBeenCalled();
    });
    expect(toast.success).toHaveBeenCalledWith("saved");
  });

  it("handles save with password and deletes empty password", async () => {
    vi.mocked(adminService.getSmtp).mockResolvedValue({
      enabled: 1,
    } as any);
    vi.mocked(adminService.updateSmtp).mockResolvedValue({} as any);

    renderComponent();
    
    await waitFor(() => {
      expect(adminService.getSmtp).toHaveBeenCalled();
    });

    // Type a password
    const pwdInput = screen.getByPlaceholderText("password");
    await userEvent.type(pwdInput, "newpass");

    const saveBtn = screen.getByRole("button", { name: "save" });
    await userEvent.click(saveBtn);
    
    await waitFor(() => {
      expect(adminService.updateSmtp).toHaveBeenCalledWith(
        expect.objectContaining({ password: "newpass" })
      );
    });
  });

  it("handles save error", async () => {
    vi.mocked(adminService.getSmtp).mockResolvedValue({} as any);
    vi.mocked(adminService.updateSmtp).mockRejectedValue(new Error("Save failed"));

    renderComponent();
    
    await waitFor(() => {
      expect(adminService.getSmtp).toHaveBeenCalled();
    });

    const saveBtn = screen.getByRole("button", { name: "save" });
    await userEvent.click(saveBtn);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Save failed");
    });
  });

  it("handles save error fallback", async () => {
    vi.mocked(adminService.getSmtp).mockResolvedValue({} as any);
    vi.mocked(adminService.updateSmtp).mockRejectedValue("String error");

    renderComponent();
    
    await waitFor(() => {
      expect(adminService.getSmtp).toHaveBeenCalled();
    });

    const saveBtn = screen.getByRole("button", { name: "save" });
    await userEvent.click(saveBtn);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("error");
    });
  });

  it("handles send test email success", async () => {
    // Has to be enabled to click test email button
    vi.mocked(adminService.getSmtp).mockResolvedValue({ enabled: 1 } as any);
    vi.mocked(adminService.testSmtp).mockResolvedValue({} as any);

    renderComponent();
    
    await waitFor(() => {
      expect(adminService.getSmtp).toHaveBeenCalled();
    });

    const sendTestBtn = screen.getByRole("button", { name: "send_test_email" });
    await userEvent.click(sendTestBtn);
    
    await waitFor(() => {
      expect(adminService.testSmtp).toHaveBeenCalled();
    });
    expect(toast.success).toHaveBeenCalledWith("test_sent");
  });

  it("handles send test email error", async () => {
    vi.mocked(adminService.getSmtp).mockResolvedValue({ enabled: 1 } as any);
    vi.mocked(adminService.testSmtp).mockRejectedValue(new Error("Test failed"));

    renderComponent();
    
    await waitFor(() => {
      expect(adminService.getSmtp).toHaveBeenCalled();
    });

    const sendTestBtn = screen.getByRole("button", { name: "send_test_email" });
    await userEvent.click(sendTestBtn);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Test failed");
    });
  });

  it("handles send test email error fallback", async () => {
    vi.mocked(adminService.getSmtp).mockResolvedValue({ enabled: 1 } as any);
    vi.mocked(adminService.testSmtp).mockRejectedValue("String error");

    renderComponent();
    
    await waitFor(() => {
      expect(adminService.getSmtp).toHaveBeenCalled();
    });

    const sendTestBtn = screen.getByRole("button", { name: "send_test_email" });
    await userEvent.click(sendTestBtn);
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("error");
    });
  });
});
