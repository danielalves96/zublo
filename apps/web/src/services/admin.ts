import pb from "@/lib/pb";
import { api } from "@/lib/api";
import type { AdminSettings, User } from "@/types";
import type { AdminUser } from "@/components/admin/users/types";

export const adminService = {
  // ─── Users ──────────────────────────────────────────────────────────────────

  getUsers: () => api.get<AdminUser[]>("/api/admin/users"),

  createUser: (data: {
    name: string;
    username: string;
    email: string;
    password: string;
    passwordConfirm: string;
  }) =>
    pb.collection("users").create<User>({ ...data, emailVisibility: true }),

  updateUser: (
    id: string,
    data: { name?: string; username?: string; email?: string; password?: string },
  ) => api.patch(`/api/admin/users/${id}`, data),

  deleteUser: (id: string) => api.del(`/api/admin/users/${id}`),

  uploadAvatar: (userId: string, formData: FormData) =>
    api.postForm(`/api/admin/users/${userId}/avatar`, formData),

  /** Constructs an avatar URL using PocketBase's file serving path. */
  avatarUrl: (userId: string, avatar: string) =>
    `${pb.baseUrl}/api/files/users/${userId}/${avatar}`,

  // ─── Settings ───────────────────────────────────────────────────────────────

  getSettings: () => api.get<AdminSettings>("/api/admin/settings"),

  updateSettings: (data: Partial<AdminSettings>) =>
    api.patch<AdminSettings>("/api/admin/settings", data),

  // ─── SMTP ───────────────────────────────────────────────────────────────────

  getSmtp: () => api.get<Record<string, unknown>>("/api/admin/smtp"),

  updateSmtp: (data: Record<string, unknown>) =>
    api.post("/api/admin/smtp", data),

  testSmtp: () => api.post("/api/admin/smtp/test"),

  // ─── Backup / Restore ───────────────────────────────────────────────────────

  /** Returns a Response so callers can handle the binary blob themselves. */
  backupRaw: () =>
    fetch("/api/db/backup", {
      headers: { Authorization: `Bearer ${pb.authStore.token}` },
    }),

  restore: (formData: FormData) =>
    api.postForm("/api/db/restore", formData),

  // ─── Cron jobs ──────────────────────────────────────────────────────────────

  runCron: (job: string) => api.post(`/api/cron/${job}`),

  // ─── Maintenance ────────────────────────────────────────────────────────────

  deleteUnusedLogos: () => api.post<{ deleted: number }>("/api/admin/deleteunusedlogos"),
};
