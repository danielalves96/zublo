import pb from "@/lib/pb";
import type { User } from "@/types";

export const usersService = {
  update: (id: string, data: FormData | Partial<User>) =>
    pb.collection("users").update<User>(id, data),

  delete: (id: string) => pb.collection("users").delete(id),

  avatarUrl: (user: User) =>
    user.avatar ? pb.files.getUrl(user, user.avatar) : null,
};
