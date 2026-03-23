import { render, screen } from "@testing-library/react";

import { PaymentMethodsTab } from "./PaymentMethodsTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: [{ id: "pm1", name: "Visa", icon: "", user: "u1" }],
    isLoading: false,
  }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/services/paymentMethods", () => ({
  paymentMethodsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    iconUrl: vi.fn(() => null),
    getIconUrl: vi.fn(() => null),
  },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { paymentMethods: { all: () => ["paymentMethods"] } },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

describe("PaymentMethodsTab", () => {
  it("renders heading", () => {
    render(<PaymentMethodsTab />);
    expect(screen.getByText("payment_methods")).toBeInTheDocument();
  });
});
