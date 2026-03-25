import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { UserListItem } from "./UserListItem";
import type { AdminUser } from "./types";
import { adminService } from "@/services/admin";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/services/admin", () => ({
  adminService: {
    avatarUrl: vi.fn(),
  },
}));

describe("UserListItem", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultUser: AdminUser = {
    id: "1",
    email: "test@example.com",
    name: "Test User",
    username: "testuser",
    avatar: "avatar.png",
    is_admin: false,
    totp_enabled: false,
    created: "2023-01-01",
  };

  it("renders correctly with full data", () => {
    vi.mocked(adminService.avatarUrl).mockReturnValue("http://localhost/avatar.png");
    
    render(
      <UserListItem 
        user={defaultUser} 
        onDelete={vi.fn()} 
        onEdit={vi.fn()} 
      />
    );
    
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("@testuser")).toBeInTheDocument();
  });

  it("renders correctly with only email", () => {
    vi.mocked(adminService.avatarUrl).mockReturnValue("");
    
    render(
      <UserListItem 
        user={{
          ...defaultUser,
          name: "",
          username: "",
        }} 
        onDelete={vi.fn()} 
        onEdit={vi.fn()} 
      />
    );
    
    expect(screen.getAllByText("test@example.com").length).toBeGreaterThan(0);
    
    // Fallback to "T" from "test@example.com"
    expect(screen.getByText("T")).toBeInTheDocument();
  });

  it("renders correctly with fallback to 'U' when no display info available", () => {
    vi.mocked(adminService.avatarUrl).mockReturnValue("");
    
    render(
      <UserListItem 
        user={{
          ...defaultUser,
          name: "",
          username: "",
          email: "",
        }} 
        onDelete={vi.fn()} 
        onEdit={vi.fn()} 
      />
    );
    
    // Fallback to "U"
    expect(screen.getByText("U")).toBeInTheDocument();
  });

  it("shows admin badge", () => {
    vi.mocked(adminService.avatarUrl).mockReturnValue("");
    
    render(
      <UserListItem 
        user={{
          ...defaultUser,
          is_admin: true,
        }} 
        onDelete={vi.fn()} 
        onEdit={vi.fn()} 
      />
    );
    
    expect(screen.getByText("admin")).toBeInTheDocument();
  });

  it("shows self badge", () => {
    vi.mocked(adminService.avatarUrl).mockReturnValue("");
    
    render(
      <UserListItem 
        user={defaultUser} 
        currentUserId="1"
        onDelete={vi.fn()} 
        onEdit={vi.fn()} 
      />
    );
    
    expect(screen.getByText("you_label")).toBeInTheDocument();
  });

  it("shows 2FA badge", () => {
    vi.mocked(adminService.avatarUrl).mockReturnValue("");
    
    render(
      <UserListItem 
        user={{
          ...defaultUser,
          totp_enabled: true,
        }} 
        onDelete={vi.fn()} 
        onEdit={vi.fn()} 
      />
    );
    
    expect(screen.getByText("2FA")).toBeInTheDocument();
  });

  it("calls onDelete when delete button is clicked", async () => {
    vi.mocked(adminService.avatarUrl).mockReturnValue("");
    const onDelete = vi.fn();
    
    render(
      <UserListItem 
        user={defaultUser} 
        onDelete={onDelete} 
        onEdit={vi.fn()} 
      />
    );
    
    // We expect 2 buttons (edit and delete)
    const buttons = screen.getAllByRole("button");
    const deleteBtn = buttons[1];
    
    await userEvent.click(deleteBtn);
    expect(onDelete).toHaveBeenCalled();
  });

  it("calls onEdit when edit button is clicked", async () => {
    vi.mocked(adminService.avatarUrl).mockReturnValue("");
    const onEdit = vi.fn();
    
    render(
      <UserListItem 
        user={defaultUser} 
        onDelete={vi.fn()} 
        onEdit={onEdit} 
      />
    );
    
    const buttons = screen.getAllByRole("button");
    const editBtn = buttons[0];
    
    await userEvent.click(editBtn);
    expect(onEdit).toHaveBeenCalled();
  });

  it("disables delete button for self", () => {
    vi.mocked(adminService.avatarUrl).mockReturnValue("");
    
    render(
      <UserListItem 
        user={defaultUser} 
        currentUserId="1"
        onDelete={vi.fn()} 
        onEdit={vi.fn()} 
      />
    );
    
    const buttons = screen.getAllByRole("button");
    const deleteBtn = buttons[1];
    
    expect(deleteBtn).toBeDisabled();
  });
});
