import pb from "@/lib/pb";
import { api } from "@/lib/api";
import type { AISettings, AIRecommendation } from "@/types";

export const aiService = {
  getSettings: async (userId: string): Promise<AISettings | null> => {
    try {
      const result = await pb.collection("ai_settings").getList<AISettings>(1, 1, {
        filter: `user = "${userId}"`,
      });
      return result.items[0] ?? null;
    } catch {
      return null;
    }
  },

  createSettings: (data: Partial<AISettings>) =>
    pb.collection("ai_settings").create<AISettings>(data),

  updateSettings: (id: string, data: Partial<AISettings>) =>
    pb.collection("ai_settings").update<AISettings>(id, data),

  listRecommendations: (userId: string) =>
    pb.collection("ai_recommendations").getFullList<AIRecommendation>({
      filter: `user = "${userId}"`,
    }),

  deleteRecommendation: (id: string) =>
    pb.collection("ai_recommendations").delete(id),

  generate: () => api.post<{ count: number }>("/api/ai/generate"),

  getModels: () => api.get<{ models: string[] }>("/api/ai/models"),
};
