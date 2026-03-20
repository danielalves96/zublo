import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { yearlyCostsService } from "@/services/yearlyCosts";

export function useYearlyCosts(userId: string) {
  return useQuery({
    queryKey: queryKeys.yearlyCosts.all(userId),
    queryFn: () => yearlyCostsService.list(userId),
    enabled: !!userId,
  });
}
