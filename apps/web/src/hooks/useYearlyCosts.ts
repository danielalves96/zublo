import { useQuery } from "@tanstack/react-query";
import pb from "@/lib/pb";
import type { YearlyCost } from "@/types";

export function useYearlyCosts(userId: string) {
  return useQuery({
    queryKey: ["yearly-costs", userId],
    queryFn: async () => {
      const records = await pb
        .collection("yearly_costs")
        .getFullList<YearlyCost>({
          filter: `user = "${userId}"`,
          sort: "year,month",
        });
      return records;
    },
    enabled: !!userId,
  });
}
