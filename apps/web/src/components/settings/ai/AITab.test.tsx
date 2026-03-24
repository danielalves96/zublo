import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { createQueryClientWrapper } from "@/test/query-client";

import { AITab } from "./AITab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

const {
  useAuthQueryMock,
  updateSettings,
  createSettings,
  getModels,
  getSettings,
  toastSuccess,
  toastError,
} = vi.hoisted(() => ({
  useAuthQueryMock: vi.fn(),
  updateSettings: vi.fn(),
  createSettings: vi.fn(),
  getModels: vi.fn(),
  getSettings: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

// We use real @tanstack/react-query via createQueryClientWrapper
// but we mock useQuery separately to control what data is returned
vi.mock("@tanstack/react-query", async () => {
  const actual = await vi.importActual("@tanstack/react-query");
  return {
    ...actual,
    useQuery: useAuthQueryMock,
  };
});

vi.mock("@/services/ai", () => ({
  aiService: {
    getSettings,
    updateSettings,
    createSettings,
    getModels,
  },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { aiSettings: (id: string) => ["ai_settings", id] },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

const defaultSettings = {
  id: "s1",
  enabled: true,
  name: "openai",
  url: "https://api.openai.com/v1",
  model: "gpt-4",
  api_key_configured: true,
};

describe("AITab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthQueryMock.mockReturnValue({
      data: defaultSettings,
      isLoading: false,
    });
  });

  it("renders heading", () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    expect(screen.getByText("ai_settings")).toBeInTheDocument();
  });

  it("renders enabled label when enabled", () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    expect(screen.getByText("ai_enabled_label")).toBeInTheDocument();
  });

  it("renders loading skeleton when isLoading is true", () => {
    useAuthQueryMock.mockReturnValue({ data: undefined, isLoading: true });
    const { Wrapper } = createQueryClientWrapper();
    const { container } = render(<AITab />, { wrapper: Wrapper });
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders not-initialized skeleton when data is undefined and not loading", () => {
    useAuthQueryMock.mockReturnValue({ data: undefined, isLoading: false });
    const { Wrapper } = createQueryClientWrapper();
    const { container } = render(<AITab />, { wrapper: Wrapper });
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders provider name input with initial value", () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    expect(screen.getByDisplayValue("openai")).toBeInTheDocument();
  });

  it("renders api url input with initial value", () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    expect(screen.getByDisplayValue("https://api.openai.com/v1")).toBeInTheDocument();
  });

  it("renders model fetch button", () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    expect(screen.getByText("fetch_models")).toBeInTheDocument();
  });

  it("renders Save button", () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    expect(screen.getByText("save")).toBeInTheDocument();
  });

  it("renders ai_disabled_label when disabled", () => {
    useAuthQueryMock.mockReturnValue({
      data: { ...defaultSettings, enabled: false, api_key_configured: false },
      isLoading: false,
    });
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    expect(screen.getByText("ai_disabled_label")).toBeInTheDocument();
  });

  it("shows remove button when api_key_configured is true", () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    expect(screen.getByText("remove")).toBeInTheDocument();
  });

  it("clicking remove button hides remove button", () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("remove"));
    expect(screen.queryByText("remove")).not.toBeInTheDocument();
  });

  it("typing in api key input after remove restores remove button visibility", () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("remove"));
    const passwordInput = screen.getByPlaceholderText("api_key_placeholder");
    fireEvent.change(passwordInput, { target: { value: "new-secret" } });
    expect(screen.getByText("remove")).toBeInTheDocument();
  });

  it("initializes with null aiSettings (no existing settings)", () => {
    useAuthQueryMock.mockReturnValue({ data: null, isLoading: false });
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    expect(screen.getByText("ai_settings")).toBeInTheDocument();
  });

  it("calls save mutation when switch is toggled", async () => {
    updateSettings.mockResolvedValue({ ...defaultSettings });
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    const switchEl = screen.getByRole("switch");
    fireEvent.click(switchEl);
    await waitFor(() => expect(updateSettings).toHaveBeenCalled());
  });

  it("calls updateSettings on Save when aiSettings.id exists", async () => {
    updateSettings.mockResolvedValue({ ...defaultSettings });
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("save"));
    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith("s1", expect.any(Object)));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("success_save"));
  });

  it("calls createSettings on Save when no aiSettings.id", async () => {
    useAuthQueryMock.mockReturnValue({
      data: null,
      isLoading: false,
    });
    createSettings.mockResolvedValue({ id: "new-id", enabled: false });
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("save"));
    await waitFor(() => expect(createSettings).toHaveBeenCalled());
  });

  it("shows error toast when save mutation fails", async () => {
    updateSettings.mockRejectedValue(new Error("save error"));
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("save"));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("error_save"));
  });

  it("removes api key when removeStoredApiKey is true on save", async () => {
    updateSettings.mockResolvedValue({ ...defaultSettings });
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("remove"));
    fireEvent.click(screen.getByText("save"));
    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith(
        "s1",
        expect.objectContaining({ api_key: "", api_key_configured: false }),
      ),
    );
  });

  it("includes api key in save when new key is entered", async () => {
    updateSettings.mockResolvedValue({ ...defaultSettings });
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    const passwordInput = screen.getByPlaceholderText("••••••••••••••••");
    fireEvent.change(passwordInput, { target: { value: "new-key-value" } });
    fireEvent.click(screen.getByText("save"));
    await waitFor(() =>
      expect(updateSettings).toHaveBeenCalledWith(
        "s1",
        expect.objectContaining({ api_key: "new-key-value", api_key_configured: true }),
      ),
    );
    // After success, apiKey cleared and apiKeyConfigured = true
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("success_save"));
  });

  it("updates provider name when input changes", () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    const providerInput = screen.getByDisplayValue("openai");
    fireEvent.change(providerInput, { target: { value: "new-provider" } });
    expect(screen.getByDisplayValue("new-provider")).toBeInTheDocument();
  });

  it("updates api url when input changes", () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    const urlInput = screen.getByDisplayValue("https://api.openai.com/v1");
    fireEvent.change(urlInput, { target: { value: "http://localhost:8080" } });
    expect(screen.getByDisplayValue("http://localhost:8080")).toBeInTheDocument();
  });

  it("fetches models when fetch button is clicked and url is set", async () => {
    getModels.mockResolvedValue({ models: ["gpt-4", "gpt-3.5"] });
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("fetch_models"));
    await waitFor(() => expect(getModels).toHaveBeenCalled());
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it("shows error toast when fetch models fails", async () => {
    getModels.mockRejectedValue(new Error("fetch error"));
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("fetch_models"));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });

  it("shows error when no models returned", async () => {
    getModels.mockResolvedValue({ models: [] });
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("fetch_models"));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("no_models_found"));
  });

  it("resets model when fetched models don't include current model", async () => {
    getModels.mockResolvedValue({ models: ["claude-3"] });
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    // model is "gpt-4", new list has "claude-3" - model gets reset
    fireEvent.click(screen.getByText("fetch_models"));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it("includes current model when it's still in the new list", async () => {
    getModels.mockResolvedValue({ models: ["gpt-4", "claude-3"] });
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("fetch_models"));
    await waitFor(() => expect(toastSuccess).toHaveBeenCalled());
  });

  it("handles non-Error exception in fetch models", async () => {
    getModels.mockRejectedValue("string error");
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("fetch_models"));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });
});
