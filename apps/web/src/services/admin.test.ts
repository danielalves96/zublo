vi.mock("@/lib/api", () => ({
  api: {
    get: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
    post: vi.fn(),
    postForm: vi.fn(),
  },
}));

vi.mock("@/lib/pb", () => ({
  default: {
    baseUrl: "https://pb.example.com",
    authStore: {
      token: "admin-token",
    },
    collection: vi.fn(),
  },
}));

import { api } from "@/lib/api";
import pb from "@/lib/pb";

import { adminService } from "./admin";

describe("adminService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("proxies user endpoints and creates users with email visibility", async () => {
    const create = vi.fn().mockResolvedValue({ id: "user-1" });
    (pb.collection as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      create,
    });
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (api.patch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (api.del as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (api.postForm as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    const formData = new FormData();
    formData.append("avatar", new Blob(["a"]), "a.png");

    await adminService.getUsers();
    await adminService.createUser({
      name: "Daniel",
      username: "daniel",
      email: "mail@example.com",
      password: "secret",
      passwordConfirm: "secret",
    });
    await adminService.updateUser("user-1", { name: "Ana" });
    await adminService.deleteUser("user-1");
    await adminService.uploadAvatar("user-1", formData);

    expect(api.get).toHaveBeenCalledWith("/api/admin/users");
    expect(create).toHaveBeenCalledWith({
      name: "Daniel",
      username: "daniel",
      email: "mail@example.com",
      password: "secret",
      passwordConfirm: "secret",
      emailVisibility: true,
    });
    expect(api.patch).toHaveBeenCalledWith("/api/admin/users/user-1", {
      name: "Ana",
    });
    expect(api.del).toHaveBeenCalledWith("/api/admin/users/user-1");
    expect(api.postForm).toHaveBeenCalledWith(
      "/api/admin/users/user-1/avatar",
      formData,
    );
  });

  it("builds the admin avatar URL from the PocketBase base URL", () => {
    expect(adminService.avatarUrl("user-1", "avatar.png")).toBe(
      "https://pb.example.com/api/files/users/user-1/avatar.png",
    );
  });

  it("proxies settings and smtp endpoints", async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (api.patch as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await adminService.getSettings();
    await adminService.updateSettings({ disable_login: true });
    await adminService.getSmtp();
    await adminService.updateSmtp({ smtp_host: "mail.example.com" });
    await adminService.testSmtp();

    expect(api.get).toHaveBeenNthCalledWith(1, "/api/admin/settings");
    expect(api.patch).toHaveBeenCalledWith("/api/admin/settings", {
      disable_login: true,
    });
    expect(api.get).toHaveBeenNthCalledWith(2, "/api/admin/smtp");
    expect(api.post).toHaveBeenNthCalledWith(1, "/api/admin/smtp", {
      smtp_host: "mail.example.com",
    });
    expect(api.post).toHaveBeenNthCalledWith(2, "/api/admin/smtp/test");
  });

  it("backs up, restores, runs cron jobs, and deletes unused logos", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    const formData = new FormData();
    formData.append("file", new Blob(["db"]), "backup.zip");
    vi.stubGlobal("fetch", fetchMock);
    (api.postForm as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (api.post as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await adminService.backupRaw();
    await adminService.restore(formData);
    await adminService.runCron("daily");
    await adminService.deleteUnusedLogos();

    expect(fetchMock).toHaveBeenCalledWith("/api/db/backup", {
      headers: { Authorization: "Bearer admin-token" },
    });
    expect(api.postForm).toHaveBeenCalledWith("/api/db/restore", formData);
    expect(api.post).toHaveBeenNthCalledWith(1, "/api/cron/daily");
    expect(api.post).toHaveBeenNthCalledWith(
      2,
      "/api/admin/deleteunusedlogos",
    );
  });
});
