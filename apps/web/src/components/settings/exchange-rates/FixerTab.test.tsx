import { render, screen } from "@testing-library/react";

import { FixerTab } from "./FixerTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: { id: "f1", api_key_configured: false, provider: "fixer" },
  }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/services/fixer", () => ({
  fixerService: { getSettings: vi.fn(), updateSettings: vi.fn(), createSettings: vi.fn(), updateRates: vi.fn() },
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
  it("renders heading", () => {
    render(<FixerTab />);
    expect(screen.getByText("fixer_api")).toBeInTheDocument();
  });
});
