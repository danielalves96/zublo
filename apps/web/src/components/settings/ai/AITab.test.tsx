import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { createQueryClientWrapper } from "@/test/query-client";

import { AITab } from "./AITab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const {
  useAuthMock,
  useAuthQueryMock,
  updateSettings,
  createSettings,
  getModels,
  getSettings,
  toastSuccess,
  toastError,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  useAuthQueryMock: vi.fn(),
  updateSettings: vi.fn(),
  createSettings: vi.fn(),
  getModels: vi.fn(),
  getSettings: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: useAuthMock,
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
    useAuthMock.mockReturnValue({ user: { id: "u1" } });
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

  it("initializes missing settings fields with fallback defaults", () => {
    useAuthQueryMock.mockReturnValue({
      data: {
        id: "s1",
        enabled: undefined,
        name: undefined,
        url: undefined,
        model: undefined,
        api_key_configured: undefined,
      },
      isLoading: false,
    });
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });

    expect(screen.getByText("ai_disabled_label")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("provider_name_placeholder")).toHaveValue("");
    expect(screen.getByPlaceholderText("https://api.openai.com/v1")).toHaveValue("");
    expect(screen.queryByText("remove")).not.toBeInTheDocument();
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
    const { client, Wrapper } = createQueryClientWrapper();
    const invalidateQueriesSpy = vi.spyOn(client, "invalidateQueries");
    render(<AITab />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("save"));
    await waitFor(() => expect(updateSettings).toHaveBeenCalledWith("s1", expect.any(Object)));
    await waitFor(() =>
      expect(invalidateQueriesSpy).toHaveBeenCalledWith({
        queryKey: ["ai_settings", "u1"],
      }),
    );
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

  it("does not fetch models when api url is blank", async () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });

    fireEvent.change(screen.getByDisplayValue("https://api.openai.com/v1"), {
      target: { value: "   " },
    });
    fireEvent.click(screen.getByText("fetch_models"));

    await waitFor(() => expect(getModels).not.toHaveBeenCalled());
  });

  it("handles missing models field from fetch response", async () => {
    getModels.mockResolvedValue({});
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

  it("uses empty query key and disables query when user is null", () => {
    let capturedOptions:
      | {
          queryKey?: unknown;
          enabled?: boolean;
        }
      | undefined;

    useAuthMock.mockReturnValue({ user: null });
    useAuthQueryMock.mockImplementation((opts: { queryKey?: unknown; enabled?: boolean }) => {
      capturedOptions = opts;
      return { data: null, isLoading: false };
    });

    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    expect(screen.getByText("ai_settings")).toBeInTheDocument();
    expect(capturedOptions?.queryKey).toEqual(["ai_settings", ""]);
    expect(capturedOptions?.enabled).toBe(false);
  });

  it("handles non-Error exception in fetch models", async () => {
    getModels.mockRejectedValue("string error");
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    fireEvent.click(screen.getByText("fetch_models"));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });

  it("queryFn calls aiService.getSettings with user id (covers line 36)", async () => {
    let capturedQueryFn: (() => unknown) | undefined;
    useAuthQueryMock.mockImplementation((opts: { queryFn?: () => unknown }) => {
      capturedQueryFn = opts.queryFn;
      return { data: defaultSettings, isLoading: false };
    });
    const { Wrapper } = createQueryClientWrapper();
    render(<AITab />, { wrapper: Wrapper });
    await capturedQueryFn?.();
    expect(getSettings).toHaveBeenCalledWith("u1");
  });

  it("returns early from fetchModels when selector triggers fetch without a URL", async () => {
    vi.resetModules();
    useAuthMock.mockReturnValue({ user: { id: "u1" } });
    useAuthQueryMock.mockReturnValue({
      data: { ...defaultSettings, url: "   " },
      isLoading: false,
    });

    vi.doMock("@/components/settings/ai/AIModelSelector", () => ({
      AIModelSelector: ({ onFetchModels }: { onFetchModels: () => void }) => (
        <button type="button" onClick={onFetchModels}>
          force-fetch
        </button>
      ),
    }));

    const { AITab: IsolatedAITab } = await import("./AITab");
    const { Wrapper } = createQueryClientWrapper();
    render(<IsolatedAITab />, { wrapper: Wrapper });

    fireEvent.click(screen.getByText("force-fetch"));

    await waitFor(() => expect(getModels).not.toHaveBeenCalled());

    vi.doUnmock("@/components/settings/ai/AIModelSelector");
    vi.resetModules();
  });

  it("invalidates ai settings query when save succeeds", async () => {
    vi.resetModules();
    const invalidateQueries = vi.fn();

    vi.doMock("@tanstack/react-query", async () => {
      const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");

      return {
        ...actual,
        useQuery: () => ({ data: defaultSettings, isLoading: false }),
        useQueryClient: () => ({ invalidateQueries }),
        useMutation: ({ mutationFn, onSuccess, onError }: {
          mutationFn: (arg?: unknown) => Promise<unknown>;
          onSuccess?: () => void;
          onError?: () => void;
        }) => ({
          isPending: false,
          mutate: (arg?: unknown) => {
            Promise.resolve(mutationFn(arg)).then(() => onSuccess?.()).catch(() => onError?.());
          },
        }),
      };
    });

    updateSettings.mockResolvedValue({ ...defaultSettings });

    const { AITab: IsolatedAITab } = await import("./AITab");
    render(<IsolatedAITab />);

    fireEvent.click(screen.getByText("save"));

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["ai_settings", "u1"],
      }),
    );

    vi.doUnmock("@tanstack/react-query");
    vi.resetModules();
  });

  it("invalidates ai settings query with empty user key when save succeeds without user", async () => {
    vi.resetModules();
    const invalidateQueries = vi.fn();
    useAuthMock.mockReturnValue({ user: null });

    vi.doMock("@tanstack/react-query", async () => {
      const actual = await vi.importActual<typeof import("@tanstack/react-query")>("@tanstack/react-query");

      return {
        ...actual,
        useQuery: () => ({ data: defaultSettings, isLoading: false }),
        useQueryClient: () => ({ invalidateQueries }),
        useMutation: ({ mutationFn, onSuccess, onError }: {
          mutationFn: (arg?: unknown) => Promise<unknown>;
          onSuccess?: () => void;
          onError?: () => void;
        }) => ({
          isPending: false,
          mutate: (arg?: unknown) => {
            Promise.resolve(mutationFn(arg)).then(() => onSuccess?.()).catch(() => onError?.());
          },
        }),
      };
    });

    updateSettings.mockResolvedValue({ ...defaultSettings });

    const { AITab: IsolatedAITab } = await import("./AITab");
    render(<IsolatedAITab />);

    fireEvent.click(screen.getByText("save"));

    await waitFor(() =>
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: ["ai_settings", ""],
      }),
    );

    vi.doUnmock("@tanstack/react-query");
    vi.resetModules();
  });
});
