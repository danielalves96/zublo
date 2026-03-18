import pb from "@/lib/pb";
import { api } from "@/lib/api";
import type { YearlyCost } from "@/types";

export const yearlyCostsService = {
  list: (userId: string) =>
    pb.collection("yearly_costs").getFullList<YearlyCost>({
      filter: pb.filter("user = {:userId}", { userId }),
      sort: "year,month",
    }),

  snapshot: () => api.post("/api/costs/snapshot"),
};
