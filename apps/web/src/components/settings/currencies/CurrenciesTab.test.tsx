import { render, screen } from "@testing-library/react";

import { CurrenciesTab } from "./CurrenciesTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [{ id: "cu1", name: "USD", symbol: "$", code: "USD", user: "u1" }], isLoading: false }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/services/currencies", () => ({
  currenciesService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { currencies: { all: () => ["currencies"] } },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

describe("CurrenciesTab", () => {
  it("renders heading", () => {
    render(<CurrenciesTab />);
    expect(screen.getByText("currencies")).toBeInTheDocument();
  });
});
