import { render, screen } from "@testing-library/react";

import { OIDCTab } from "./OIDCTab";

const mockSettings = vi.hoisted(() => ({
  id: "s1",
  oidc_enabled: false,
  oidc_client_secret_configured: false,
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mockSettings }),
  useMutation: () => ({ mutate: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/services/admin", () => ({
  adminService: { getSettings: vi.fn(), updateSettings: vi.fn() },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { admin: { settings: () => ["admin", "settings"] } },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("OIDCTab", () => {
  it("renders OIDC heading", () => {
    render(<OIDCTab />);
    expect(screen.getByText("OIDC / SSO")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<OIDCTab />);
    expect(screen.getByText("oidc_desc")).toBeInTheDocument();
  });

  it("renders enabled switch", () => {
    render(<OIDCTab />);
    expect(screen.getByText("enabled")).toBeInTheDocument();
  });
});
