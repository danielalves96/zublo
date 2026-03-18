import pb from "@/lib/pb";
import type { User } from "@/types";

export const authService = {
  isValid: () => pb.authStore.isValid,

  getToken: () => pb.authStore.token,

  getModel: () => pb.authStore.model as User | null,

  clear: () => pb.authStore.clear(),

  loginWithPassword: (email: string, password: string) =>
    pb.collection("users").authWithPassword<User>(email, password),

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
