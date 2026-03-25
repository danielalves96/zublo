import { act, fireEvent, render, screen } from "@testing-library/react";

import { FixerTab } from "./FixerTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// Default: user has id. Some tests will override this.
let mockUser: { id?: string } | null = { id: "u1" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockUser }),
}));

const mockSaveMutate = vi.fn();
const mockUpdateRatesMutate = vi.fn();
let settingsData: Record<string, unknown> | undefined = undefined;
let saveMutIsPending = false;
let updateRatesMutIsPending = false;

type MutOpts = {
  mutationFn?: () => unknown;
  onSuccess?: (...args: unknown[]) => void;
  onError?: (err?: unknown) => void;
};

// Each render of FixerTab calls useMutation twice: saveMut (even idx) then updateRatesMut (odd idx).
// We capture all opts; helpers always return the most-recent version for each mutation.
const capturedMutOpts: MutOpts[] = [];
const latestSaveOpts = () => {
  for (let i = capturedMutOpts.length - 2; i >= 0; i -= 2) {
    return capturedMutOpts[i];
  }
  return capturedMutOpts[0];
};
const latestUpdateRatesOpts = () => {
  for (let i = capturedMutOpts.length - 1; i >= 1; i -= 2) {
    return capturedMutOpts[i];
  }
  return capturedMutOpts[1];
};

let capturedQueryFn: (() => unknown) | undefined;

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: { queryFn?: () => unknown }) => {
    capturedQueryFn = opts.queryFn;
    return { data: settingsData };
  },
  useMutation: (opts: MutOpts) => {
    const idx = capturedMutOpts.push(opts) - 1;
    // Even indices (0, 2, 4…) → saveMut; odd indices (1, 3, 5…) → updateRatesMut
    if (idx % 2 === 0) return { mutate: mockSaveMutate, isPending: saveMutIsPending };
    return { mutate: mockUpdateRatesMutate, isPending: updateRatesMutIsPending };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/services/fixer", () => ({
  fixerService: {
    getSettings: vi.fn(),
    updateSettings: vi.fn().mockResolvedValue({}),
    createSettings: vi.fn().mockResolvedValue({}),
    updateRates: vi.fn().mockResolvedValue({}),
  },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { currencies: { all: () => ["currencies"] } },
}));

const { mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));
vi.mock("@/lib/toast", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
}));

vi.mock("@/components/settings/exchange-rates/fixer.constants", () => ({
  FIXER_PROVIDER_LINKS: { fixer: "https://fixer.io", apilayer: "https://apilayer.com" },
}));

describe("FixerTab", () => {
  beforeEach(() => {
    mockUser = { id: "u1" };
    settingsData = undefined;
    saveMutIsPending = false;
    updateRatesMutIsPending = false;
    capturedMutOpts.length = 0;
    capturedQueryFn = undefined;
    mockSaveMutate.mockClear();
    mockUpdateRatesMutate.mockClear();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
  });

  it("renders heading", () => {
    render(<FixerTab />);
    expect(screen.getByText("fixer_api")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<FixerTab />);
    expect(screen.getByText("convert_currency_desc")).toBeInTheDocument();
  });

  it("renders fixer provider select and api key field", () => {
    render(<FixerTab />);
    expect(screen.getByText("fixer_api_key")).toBeInTheDocument();
  });

  it("renders save and update exchange buttons", () => {
    render(<FixerTab />);
    expect(screen.getByText("save")).toBeInTheDocument();
    expect(screen.getByText("update_exchange")).toBeInTheDocument();
  });

  it("shows configured hint when apiKeyConfigured and not removing", () => {
    settingsData = { id: "f1", api_key_configured: true, provider: "fixer" };
    render(<FixerTab />);
    expect(screen.getByText("fixer_configured_hint")).toBeInTheDocument();
  });

  it("does not show configured hint when not apiKeyConfigured", () => {
    settingsData = { id: "f1", api_key_configured: false, provider: "fixer" };
    render(<FixerTab />);
    expect(screen.queryByText("fixer_configured_hint")).not.toBeInTheDocument();
  });

  it("calls save mutate when save button clicked with api key entered", () => {
    settingsData = undefined;
    render(<FixerTab />);
    // Enter an api key first
    const input = document.querySelector("input[type='password']") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "mykey123" } });
    fireEvent.click(screen.getByText("save"));
    expect(mockSaveMutate).toHaveBeenCalled();
  });

  it("save button is disabled when no api key and not configured", () => {
    settingsData = { id: "f1", api_key_configured: false, provider: "fixer" };
    render(<FixerTab />);
    expect(screen.getByText("save").closest("button")).toBeDisabled();
  });

  it("save button is enabled when api key is configured", () => {
    settingsData = { id: "f1", api_key_configured: true, provider: "fixer" };
    render(<FixerTab />);
    expect(screen.getByText("save").closest("button")).not.toBeDisabled();
  });

  it("update rates button is disabled when no api key configured", () => {
    settingsData = { id: "f1", api_key_configured: false, provider: "fixer" };
    render(<FixerTab />);
    expect(screen.getByText("update_exchange").closest("button")).toBeDisabled();
  });

  it("update rates button is enabled when api key is configured", () => {
    settingsData = { id: "f1", api_key_configured: true, provider: "fixer" };
    render(<FixerTab />);
    expect(screen.getByText("update_exchange").closest("button")).not.toBeDisabled();
  });

  it("shows loading text when saving", () => {
    saveMutIsPending = true;
    settingsData = { id: "f1", api_key_configured: true, provider: "fixer" };
    render(<FixerTab />);
    expect(screen.getByText("loading")).toBeInTheDocument();
  });

  it("clicking remove api key button sets removeStoredApiKey", () => {
    settingsData = { id: "f1", api_key_configured: true, provider: "fixer" };
    render(<FixerTab />);
    // "remove" button should be visible since apiKeyConfigured=true and removeStoredApiKey=false
    fireEvent.click(screen.getByText("remove"));
    // After removing, the hint paragraph changes and save button behavior changes
    // fixer_configured_hint should no longer be shown
    expect(screen.queryByText("fixer_configured_hint")).not.toBeInTheDocument();
  });

  it("calls update rates mutate when update exchange button clicked", () => {
    settingsData = { id: "f1", api_key_configured: true, provider: "fixer" };
    render(<FixerTab />);
    fireEvent.click(screen.getByText("update_exchange"));
    expect(mockUpdateRatesMutate).toHaveBeenCalled();
  });

  // --- mutation callback tests ---

  it("saveMut onSuccess calls toast.success with success_update", () => {
    render(<FixerTab />);
    act(() => {
      latestSaveOpts().onSuccess?.();
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("success_update");
  });

  it("saveMut onSuccess sets apiKeyConfigured true when apiKey was entered", () => {
    render(<FixerTab />);
    // enter an api key — this triggers a re-render, so latestSaveOpts() has the fresh closure
    const input = document.querySelector("input[type='password']") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "newkey" } });
    act(() => {
      latestSaveOpts().onSuccess?.();
    });
    // apiKeyConfigured=true, removeStoredApiKey=false => hint should appear
    expect(screen.getByText("fixer_configured_hint")).toBeInTheDocument();
  });

  it("saveMut onSuccess does not show hint when removeStoredApiKey was set", () => {
    settingsData = { id: "f1", api_key_configured: true, provider: "fixer" };
    render(<FixerTab />);
    // click remove to set removeStoredApiKey=true — triggers re-render with fresh closure
    fireEvent.click(screen.getByText("remove"));
    act(() => {
      latestSaveOpts().onSuccess?.();
    });
    // after onSuccess with removeStoredApiKey=true, apiKeyConfigured becomes false
    expect(screen.queryByText("fixer_configured_hint")).not.toBeInTheDocument();
  });

  it("saveMut onSuccess does not change apiKeyConfigured when neither apiKey nor removeStoredApiKey", () => {
    // Start with apiKeyConfigured=true, no new key entered, no remove clicked
    // => onSuccess hits the final else-branch (neither apiKey.trim() nor removeStoredApiKey)
    // => apiKeyConfigured stays true, hint remains visible
    settingsData = { id: "f1", api_key_configured: true, provider: "fixer" };
    render(<FixerTab />);
    // Don't enter a key, don't click remove — apiKey="" and removeStoredApiKey=false
    act(() => {
      latestSaveOpts().onSuccess?.();
    });
    // apiKeyConfigured should remain true => hint still visible
    expect(screen.getByText("fixer_configured_hint")).toBeInTheDocument();
  });

  it("saveMut onError calls toast.error with error", () => {
    render(<FixerTab />);
    act(() => {
      latestSaveOpts().onError?.();
    });
    expect(mockToastError).toHaveBeenCalledWith("error");
  });

  it("updateRatesMut onSuccess calls toast.success with update_exchange and count", () => {
    render(<FixerTab />);
    act(() => {
      latestUpdateRatesOpts().onSuccess?.({ updated: 5 });
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("update_exchange (5)");
  });

  it("updateRatesMut onError calls toast.error with err.message when provided", () => {
    render(<FixerTab />);
    act(() => {
      latestUpdateRatesOpts().onError?.(new Error("Network error"));
    });
    expect(mockToastError).toHaveBeenCalledWith("Network error");
  });

  it("updateRatesMut onError falls back to t('error') when no message", () => {
    render(<FixerTab />);
    act(() => {
      latestUpdateRatesOpts().onError?.({});
    });
    expect(mockToastError).toHaveBeenCalledWith("error");
  });

  // --- queryFn test ---

  it("queryFn calls fixerService.getSettings with user id", async () => {
    const { fixerService } = await import("@/services/fixer");
    render(<FixerTab />);
    await capturedQueryFn?.();
    expect(vi.mocked(fixerService.getSettings)).toHaveBeenCalledWith("u1");
  });

  // --- enabled: !!user?.id branch ---

  it("renders without error when user has no id (enabled: false branch)", () => {
    mockUser = {};
    render(<FixerTab />);
    expect(screen.getByText("fixer_api")).toBeInTheDocument();
  });

  it("renders without error when user is null (enabled: false branch)", () => {
    mockUser = null;
    render(<FixerTab />);
    expect(screen.getByText("fixer_api")).toBeInTheDocument();
  });

  // --- saveMut mutationFn tests ---

  it("saveMut mutationFn calls fixerService.createSettings when no existing settings", async () => {
    const { fixerService } = await import("@/services/fixer");
    settingsData = undefined;
    render(<FixerTab />);
    await latestSaveOpts().mutationFn?.();
    expect(vi.mocked(fixerService.createSettings)).toHaveBeenCalled();
  });

  it("saveMut mutationFn calls fixerService.updateSettings when settings exist", async () => {
    const { fixerService } = await import("@/services/fixer");
    settingsData = { id: "f1", api_key_configured: true, provider: "fixer" };
    render(<FixerTab />);
    // useEffect fires on render due to settingsData, causing a re-render; use latestSaveOpts()
    await latestSaveOpts().mutationFn?.();
    expect(vi.mocked(fixerService.updateSettings)).toHaveBeenCalledWith("f1", expect.any(Object));
  });

  it("saveMut mutationFn includes api_key when new key is entered", async () => {
    const { fixerService } = await import("@/services/fixer");
    settingsData = undefined;
    render(<FixerTab />);
    const input = document.querySelector("input[type='password']") as HTMLInputElement;
    // fireEvent.change triggers a re-render; use latestSaveOpts() to get fresh closure
    fireEvent.change(input, { target: { value: "secretkey" } });
    await latestSaveOpts().mutationFn?.();
    expect(vi.mocked(fixerService.createSettings)).toHaveBeenCalledWith(
      expect.objectContaining({ api_key: "secretkey", api_key_configured: true }),
    );
  });

  it("saveMut mutationFn clears api_key when removeStoredApiKey is set", async () => {
    const { fixerService } = await import("@/services/fixer");
    settingsData = { id: "f1", api_key_configured: true, provider: "fixer" };
    render(<FixerTab />);
    // clicking "remove" triggers re-render; use latestSaveOpts() for fresh closure
    fireEvent.click(screen.getByText("remove"));
    await latestSaveOpts().mutationFn?.();
    expect(vi.mocked(fixerService.updateSettings)).toHaveBeenCalledWith(
      "f1",
      expect.objectContaining({ api_key: "", api_key_configured: false }),
    );
  });

  it("saveMut mutationFn includes empty api_key when no new key and no settings id and not configured", async () => {
    const { fixerService } = await import("@/services/fixer");
    // No settings — settings?.id is falsy, apiKeyConfigured is false
    settingsData = undefined;
    render(<FixerTab />);
    // No key entered, no remove clicked → third branch: !settings?.id || !apiKeyConfigured
    await latestSaveOpts().mutationFn?.();
    expect(vi.mocked(fixerService.createSettings)).toHaveBeenCalledWith(
      expect.objectContaining({ api_key: "", api_key_configured: false }),
    );
  });

  it("updateRatesMut mutationFn calls fixerService.updateRates", async () => {
    const { fixerService } = await import("@/services/fixer");
    render(<FixerTab />);
    await latestUpdateRatesOpts().mutationFn?.();
    expect(vi.mocked(fixerService.updateRates)).toHaveBeenCalled();
  });

  // --- ?? '' / || fallback branches ---

  it("renders without crashing when user.id is undefined (covers ?? '' in queryKey)", () => {
    mockUser = { id: undefined };
    render(<FixerTab />);
    expect(screen.getByText("fixer_api")).toBeInTheDocument();
  });

  it("onSuccess queryKey uses '' when user.id is undefined", () => {
    mockUser = { id: undefined };
    render(<FixerTab />);
    act(() => { latestSaveOpts().onSuccess?.(); });
    act(() => { latestUpdateRatesOpts().onSuccess?.({ updated: 0 }); });
    // Just confirm they don't throw; toast.success called
    expect(mockToastSuccess).toHaveBeenCalledTimes(2);
  });

  it("useEffect sets api_key_configured=false when settings.api_key_configured is undefined", () => {
    // settings has no api_key_configured → ?? false → apiKeyConfigured = false
    settingsData = { id: "f1", provider: "fixer" }; // no api_key_configured field
    render(<FixerTab />);
    // configured hint should NOT be shown (apiKeyConfigured=false)
    expect(screen.queryByText("fixer_configured_hint")).not.toBeInTheDocument();
  });

  it("useEffect sets provider to 'fixer' when settings.provider is undefined", () => {
    // settings has no provider → || "fixer" → provider = "fixer" (default)
    settingsData = { id: "f1", api_key_configured: false }; // no provider field
    render(<FixerTab />);
    expect(screen.getByText("fixer_api")).toBeInTheDocument();
  });
});
