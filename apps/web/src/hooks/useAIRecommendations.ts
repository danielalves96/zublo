import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryKeys";
import { aiService } from "@/services/ai";

export function useAIRecommendations(userId: string) {
  return useQuery({
    queryKey: queryKeys.aiRecommendations.all(userId),
    queryFn: () => aiService.listRecommendations(userId),
    enabled: !!userId,
  });
}
