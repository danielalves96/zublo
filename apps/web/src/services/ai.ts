import pb from "@/lib/pb";
import { api } from "@/lib/api";
import type { AISettings, AIRecommendation, ChatMessage, ChatResponse, ChatConversation } from "@/types";

export const aiService = {
  getSettings: async (userId: string): Promise<AISettings | null> => {
    try {
      const result = await pb.collection("ai_settings").getList<AISettings>(1, 1, {
        filter: pb.filter("user = {:userId}", { userId }),
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
      filter: pb.filter("user = {:userId}", { userId }),
    }),

  deleteRecommendation: (id: string) =>
    pb.collection("ai_recommendations").delete(id),

  generate: () => api.post<{ count: number }>("/api/ai/generate"),

  getModels: (url?: string, apiKey?: string) => {
    const params = new URLSearchParams();
    if (url) params.append("url", url);
    if (apiKey) params.append("api_key", apiKey);
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return api.get<{ models: string[] }>(`/api/ai/models${queryString}`);
  },

  chat: (
    messages: ChatMessage[],
    conversationId?: string | null,
    displayMessage?: string,
    signal?: AbortSignal,
  ) =>
    api.post<ChatResponse>("/api/ai/chat", {
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      conversation_id: conversationId ?? null,
      display_message: displayMessage ?? null,
    }, { signal }),

  getConversations: () =>
    api.get<{ conversations: ChatConversation[] }>("/api/ai/conversations"),

  getConversationMessages: (id: string) =>
    api.get<{ conversation: ChatConversation; messages: ChatMessage[] }>(
      `/api/ai/conversations/${id}`,
    ),

  deleteConversation: (id: string) =>
    api.del<{ success: boolean }>(`/api/ai/conversations/${id}`),

  renameConversation: (id: string, title: string) =>
    api.patch<{ success: boolean }>(`/api/ai/conversations/${id}`, { title }),
};
