import { api } from "@/lib/api";
import pb from "@/lib/pb";
import type { NotificationsConfig } from "@/types";

export const notificationsService = {
  getConfig: async (userId: string): Promise<NotificationsConfig | null> => {
    try {
      const result = await pb
        .collection("notifications_config")
        .getList<NotificationsConfig>(1, 1, { filter: pb.filter("user = {:userId}", { userId }) });
      return result.items[0] ?? null;
    } catch {
      return null;
    }
  },

  createConfig: (data: Partial<NotificationsConfig>) =>
    pb.collection("notifications_config").create<NotificationsConfig>(data),

  updateConfig: (id: string, data: Partial<NotificationsConfig>) =>
    pb.collection("notifications_config").update<NotificationsConfig>(id, data),

  test: (provider: string) =>
    api.post<{ message: string }>("/api/notifications/test", { provider }),
};
