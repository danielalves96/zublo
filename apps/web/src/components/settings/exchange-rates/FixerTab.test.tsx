import { fireEvent, render, screen } from "@testing-library/react";

import { FixerTab } from "./FixerTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

const mockSaveMutate = vi.fn();
const mockUpdateRatesMutate = vi.fn();
let settingsData: Record<string, unknown> | undefined = undefined;
let saveMutIsPending = false;
let updateRatesMutIsPending = false;

// Track mutation call order
let mutationCallCount = 0;
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: settingsData }),
  useMutation: () => {
    mutationCallCount++;
    const count = mutationCallCount;
    if (count % 2 === 1) return { mutate: mockSaveMutate, isPending: saveMutIsPending };
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

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/settings/exchange-rates/fixer.constants", () => ({
  FIXER_PROVIDER_LINKS: { fixer: "https://fixer.io", apilayer: "https://apilayer.com" },
}));

describe("FixerTab", () => {
  beforeEach(() => {
    settingsData = undefined;
    saveMutIsPending = false;
    updateRatesMutIsPending = false;
    mutationCallCount = 0;
    mockSaveMutate.mockClear();
    mockUpdateRatesMutate.mockClear();
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
});
