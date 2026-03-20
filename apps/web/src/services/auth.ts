import { api } from "@/lib/api";
import pb from "@/lib/pb";
import type { User } from "@/types";

interface TotpLoginChallengeResponse {
  challenge: string;
  expires_at: string;
  user_id: string;
}

export interface TotpLoginChallenge {
  challenge: string;
  expiresAt: string;
  userId: string;
}

interface TotpLoginVerifyResponse {
  token: string;
  record: User;
}

export class TotpRequiredError extends Error {
  challenge: TotpLoginChallenge;

  constructor(challenge: TotpLoginChallenge) {
    super("TOTP_REQUIRED");
    this.name = "TotpRequiredError";
    this.challenge = challenge;
  }
}

export function isTotpRequiredError(error: unknown): error is TotpRequiredError {
  return error instanceof TotpRequiredError;
}

export const authService = {
  isValid: () => pb.authStore.isValid,

  getToken: () => pb.authStore.token,

  getModel: () => pb.authStore.model as User | null,

  clear: () => pb.authStore.clear(),

  saveSession: (token: string, record: User) => pb.authStore.save(token, record),

  onChange: (callback: (token: string, model: unknown) => void, fireImmediately?: boolean) => {
    return pb.authStore.onChange(callback, fireImmediately);
  },

  loginWithPassword: (email: string, password: string) =>
    pb.collection("users").authWithPassword<User>(email, password),

  startTotpLoginChallenge: async (): Promise<TotpLoginChallenge> => {
    const response = await api.post<TotpLoginChallengeResponse>("/api/auth/totp/login-challenge");
    return {
      challenge: response.challenge,
      expiresAt: response.expires_at,
      userId: response.user_id,
    };
  },

  completeTotpLoginChallenge: (challenge: string, code: string) =>
    api.post<TotpLoginVerifyResponse>("/api/auth/totp/login-verify", { challenge, code }),

  refresh: () => pb.collection("users").authRefresh<User>(),

  register: (data: {
    username: string;
    name: string;
    email: string;
    password: string;
    passwordConfirm: string;
    language?: string;
  }) => pb.collection("users").create<User>(data),

  requestPasswordReset: (email: string) =>
    pb.collection("users").requestPasswordReset(email),
};
