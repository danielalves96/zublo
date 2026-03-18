import { api } from "@/lib/api";

interface TotpSetupResponse {
  otpauthUri: string;
  secret: string;
  backupCodes: string[];
}

interface TotpVerifyRequest {
  code: string;
  secret?: string;
  backupCodes?: string[];
}

export const totpService = {
  setup: () => api.post<TotpSetupResponse>("/api/auth/totp/setup"),

  verify: (data: TotpVerifyRequest) =>
    api.post("/api/auth/totp/verify", data),

  regenerateBackup: (code: string) =>
    api.post<{ backup_codes: string[] }>("/api/auth/totp/regenerate_backup", { code }),

  disable: (code: string) => api.post("/api/auth/totp/disable", { code }),

  reenable: (code: string) => api.post("/api/auth/totp/reenable", { code }),

  delete: (code: string) => api.post("/api/auth/totp/delete", { code }),
};
