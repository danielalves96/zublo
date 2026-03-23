import { render, screen } from "@testing-library/react";

import { CategoriesTab } from "./CategoriesTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: [{ id: "c1", name: "Streaming", user: "u1" }], isLoading: false }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/services/categories", () => ({
  categoriesService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { categories: { all: () => ["categories"] } },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

describe("CategoriesTab", () => {
  it("renders heading", () => {
    render(<CategoriesTab />);
    expect(screen.getByText("categories")).toBeInTheDocument();
  });
});
