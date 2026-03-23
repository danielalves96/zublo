import { render, screen } from "@testing-library/react";

import { HouseholdTab } from "./HouseholdTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [{ id: "h1", name: "John", user: "u1" }], isLoading: false }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/services/household", () => ({
  householdService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { household: { all: () => ["household"] } },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

describe("HouseholdTab", () => {
  it("renders heading", () => {
    render(<HouseholdTab />);
    expect(screen.getByText("household")).toBeInTheDocument();
  });
});
