import { render, screen } from "@testing-library/react";

import { UsersTab } from "./UsersTab";

const mockUsers = vi.hoisted(() => [
  {
    id: "u1", username: "john", name: "John Doe",
    email: "john@test.com", avatar: "", created: "2024-01-01",
    totp_enabled: false, is_admin: true,
  },
]);

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: mockUsers, isLoading: false }),
  useMutation: () => ({ mutate: vi.fn() }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/services/admin", () => ({
  adminService: {
    getUsers: vi.fn(),
    deleteUser: vi.fn(),
    avatarUrl: () => null,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u2" } }),
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { admin: { users: () => ["admin", "users"] } },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: () => null,
}));

vi.mock("./AddUserModal", () => ({
  AddUserModal: () => null,
}));

vi.mock("./EditUserModal", () => ({
  EditUserModal: () => null,
}));

describe("UsersTab", () => {
  it("renders heading", () => {
    render(<UsersTab />);
    expect(screen.getByText("users")).toBeInTheDocument();
  });

  it("renders add user button", () => {
    render(<UsersTab />);
    expect(screen.getByText("add_user")).toBeInTheDocument();
  });

  it("displays user count", () => {
    render(<UsersTab />);
    expect(screen.getByText(/1/)).toBeInTheDocument();
  });
});
