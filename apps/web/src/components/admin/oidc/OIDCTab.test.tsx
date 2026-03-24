import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { OIDCTab } from "./OIDCTab";
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
  },
}));

vi.mock("@/services/admin", () => ({
  adminService: {
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
  },
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

describe("OIDCTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <OIDCTab />
      </QueryClientProvider>
    );
  };

  it("renders and loads settings", async () => {
    vi.mocked(adminService.getSettings).mockResolvedValue({
      id: 1,
      oidc_enabled: 1,
      oidc_client_secret_configured: 1,
      oidc_provider_name: "TestProvider",
    } as any);

    const { container } = renderComponent();
    
    expect(screen.getByText("OIDC / SSO")).toBeInTheDocument();
    
    await waitFor(() => {
      const switchBtn = screen.getByRole("switch");
      expect(switchBtn).toBeChecked();
    });
    
    // Check fields are loaded
    const providerInput = container.querySelector('input[value="TestProvider"]') as HTMLInputElement;
    expect(providerInput).toBeInTheDocument();
  });

  it("handles saving OIDC switch toggle", async () => {
    vi.mocked(adminService.getSettings).mockResolvedValue({
      id: 1,
      oidc_enabled: 0,
    } as any);
    vi.mocked(adminService.updateSettings).mockResolvedValue({} as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("switch")).toBeInTheDocument();
    });

    const switchBtn = screen.getByRole("switch");
    fireEvent.click(switchBtn);

    await waitFor(() => {
      expect(adminService.updateSettings).toHaveBeenCalledWith({ oidc_enabled: true });
    });
    
    expect(toast.success).toHaveBeenCalledWith("saved");
  });

  it("handles remove secret", async () => {
    vi.mocked(adminService.getSettings).mockResolvedValue({
      id: 1,
      oidc_client_secret_configured: 1,
    } as any);

    renderComponent();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "remove" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "remove" }));

    await waitFor(() => {
      expect(adminService.updateSettings).toHaveBeenCalledWith({
        oidc_client_secret: "",
        oidc_client_secret_configured: false,
      });
    });
  });

  it("handles save secret", async () => {
    vi.mocked(adminService.getSettings).mockResolvedValue({
      id: 1,
      oidc_client_secret_configured: 0,
    } as any);

    const { container } = renderComponent();

    await waitFor(() => {
      const pswInput = container.querySelector('input[type="password"]') as HTMLInputElement;
      expect(pswInput).toBeInTheDocument();
    });

    const pswInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    await userEvent.type(pswInput, "newpsw123");
    fireEvent.blur(pswInput);

    await waitFor(() => {
      expect(adminService.updateSettings).toHaveBeenCalledWith({
        oidc_client_secret: "newpsw123",
        oidc_client_secret_configured: true,
      });
    });
  });

  it("handles generic field save on blur", async () => {
    vi.mocked(adminService.getSettings).mockResolvedValue({
      id: 1,
    } as any);
    vi.mocked(adminService.updateSettings).mockResolvedValue({} as any);

    const { container } = renderComponent();

    await waitFor(() => {
      expect(adminService.getSettings).toHaveBeenCalled();
    });

    // "oidc_client_id" is the second field in OIDC_FIELDS
    // Wait, the first input is provider_name, its placeholder is "oidc_provider_placeholder"
    
    const providerInput = container.querySelector('input[placeholder="oidc_provider_placeholder"]') as HTMLInputElement;
    // clear first just in case
    await userEvent.clear(providerInput);
    await userEvent.type(providerInput, "New Provider");
    fireEvent.blur(providerInput);

    await waitFor(() => {
      expect(adminService.updateSettings).toHaveBeenCalledWith({
        oidc_provider_name: "New Provider",
      });
    });
  });
  
  it("renders http placeholders correctly", async () => {
    vi.mocked(adminService.getSettings).mockResolvedValue({} as any);
    const { container } = renderComponent();
    await waitFor(() => {
      expect(adminService.getSettings).toHaveBeenCalled();
    });
    
    const issuerInput = container.querySelector('input[placeholder="https://accounts.example.com"]') as HTMLInputElement;
    expect(issuerInput).toBeInTheDocument();
  });
});
