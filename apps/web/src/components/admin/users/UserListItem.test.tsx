import { render, screen } from "@testing-library/react";

import { UserListItem } from "./UserListItem";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/services/admin", () => ({
  adminService: { avatarUrl: () => null },
}));

describe("UserListItem", () => {
  const baseUser = {
    id: "u1",
    username: "john",
    name: "John Doe",
    email: "john@test.com",
    avatar: "",
    created: "2024-01-01",
    totp_enabled: false,
    is_admin: false,
  };

  it("renders user name and email", () => {
    render(
      <ul>
        <UserListItem user={baseUser} currentUserId="u2" onEdit={vi.fn()} onDelete={vi.fn()} />
      </ul>,
    );
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@test.com")).toBeInTheDocument();
  });

  it("shows admin badge when user is admin", () => {
    render(
      <ul>
        <UserListItem user={{ ...baseUser, is_admin: true }} currentUserId="u2" onEdit={vi.fn()} onDelete={vi.fn()} />
      </ul>,
    );
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("shows 'you' badge when user is current user", () => {
    render(
      <ul>
        <UserListItem user={baseUser} currentUserId="u1" onEdit={vi.fn()} onDelete={vi.fn()} />
      </ul>,
    );
    expect(screen.getByText("you_label")).toBeInTheDocument();
  });

  it("shows 2FA badge when totp is enabled", () => {
    render(
      <ul>
        <UserListItem user={{ ...baseUser, totp_enabled: true }} currentUserId="u2" onEdit={vi.fn()} onDelete={vi.fn()} />
      </ul>,
    );
    expect(screen.getByText("2FA")).toBeInTheDocument();
  });

  it("disables delete button for self", () => {
    render(
      <ul>
        <UserListItem user={baseUser} currentUserId="u1" onEdit={vi.fn()} onDelete={vi.fn()} />
      </ul>,
    );
    const deleteBtn = screen.getByTitle("cannot_delete_yourself");
    expect(deleteBtn).toBeDisabled();
  });

  it("renders initials fallback when no avatar", () => {
    render(
      <ul>
        <UserListItem user={baseUser} currentUserId="u2" onEdit={vi.fn()} onDelete={vi.fn()} />
      </ul>,
    );
    expect(screen.getByText("J")).toBeInTheDocument();
  });
});
