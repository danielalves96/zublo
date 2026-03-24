import type { AdminUser } from "./types";

describe("users types", () => {
  it("exports AdminUser type", () => {
    const user: AdminUser = {
      id: "1",
      username: "admin",
      name: "Admin",
      email: "admin@test.com",
      avatar: "",
      created: "2024-01-01",
      totp_enabled: false,
      is_admin: true,
    };
    expect(user.is_admin).toBe(true);
  });
});
