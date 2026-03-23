import { render, screen } from "@testing-library/react";

import { DeleteAccountTab } from "./DeleteAccountTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", email: "user@test.com" }, logout: vi.fn() }),
}));

vi.mock("@/services/users", () => ({
  usersService: { delete: vi.fn() },
}));

vi.mock("@/components/ui/message-dialog", () => ({
  MessageDialog: () => null,
}));

describe("DeleteAccountTab", () => {
  it("renders heading", () => {
    render(<DeleteAccountTab />);
    expect(screen.getByText("delete_account")).toBeInTheDocument();
  });

  it("renders warning text", () => {
    render(<DeleteAccountTab />);
    expect(screen.getByText("warning_permanent_action")).toBeInTheDocument();
  });

  it("renders delete button disabled by default", () => {
    render(<DeleteAccountTab />);
    expect(screen.getByText("permanently_delete_account")).toBeDisabled();
  });

  it("shows email confirmation input", () => {
    render(<DeleteAccountTab />);
    expect(screen.getByPlaceholderText("confirm_email_placeholder")).toBeInTheDocument();
  });
});
