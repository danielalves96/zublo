import { render, screen } from "@testing-library/react";

import { TwoFactorTab } from "./TwoFactorTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", totp_enabled: false } }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: { totp_enabled: false } }),
  useMutation: () => ({ mutate: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/services/users", () => ({
  usersService: { enable2FA: vi.fn(), disable2FA: vi.fn() },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { auth: { me: () => ["auth", "me"] } },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe("TwoFactorTab", () => {
  it("renders heading", () => {
    render(<TwoFactorTab />);
    expect(screen.getByText("two_factor_auth")).toBeInTheDocument();
  });
});
