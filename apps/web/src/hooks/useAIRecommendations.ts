import { useQuery } from "@tanstack/react-query";
import pb from "@/lib/pb";
import type { AIRecommendation } from "@/types";

export function useAIRecommendations(userId: string) {
  return useQuery({
    queryKey: ["ai-recommendations", userId],
    queryFn: async () => {
      const records = await pb
        .collection("ai_recommendations")
        .getFullList<AIRecommendation>({
          filter: `user = "${userId}"`,
        });
      return records;
    },
    enabled: !!userId,
  });
}
