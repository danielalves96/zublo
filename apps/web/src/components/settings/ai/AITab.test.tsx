import { render, screen } from "@testing-library/react";

import { AITab } from "./AITab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({
    data: { id: "s1", enabled: true, name: "openai", url: "https://api.openai.com/v1", model: "gpt-4", api_key_configured: false },
    isLoading: false,
  }),
  useMutation: () => ({ mutate: vi.fn(), isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/services/ai", () => ({
  aiService: { getSettings: vi.fn(), updateSettings: vi.fn(), createSettings: vi.fn(), getModels: vi.fn() },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { aiSettings: () => ["ai_settings"] },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

describe("AITab", () => {
  it("renders heading", () => {
    render(<AITab />);
    expect(screen.getByText("ai_settings")).toBeInTheDocument();
  });

  it("renders enabled label", () => {
    render(<AITab />);
    expect(screen.getByText("ai_enabled_label")).toBeInTheDocument();
  });
});
