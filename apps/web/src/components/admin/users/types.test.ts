import type { AdminUser } from "./types";

describe("admin users types", () => {
  it("AdminUser can be constructed with all required fields", () => {
    const user: AdminUser = {
      id: "abc123",
      username: "john",
      name: "John Doe",
      email: "john@example.com",
      avatar: "",
      created: "2024-01-01",
      totp_enabled: false,
      is_admin: true,
    };
    expect(user.id).toBe("abc123");
    expect(user.is_admin).toBe(true);
    expect(user.totp_enabled).toBe(false);
  });
});
