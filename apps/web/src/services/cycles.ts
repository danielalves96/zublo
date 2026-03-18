import pb from "@/lib/pb";
import type { Cycle } from "@/types";

export const cyclesService = {
  /** Global list — cycles are not user-scoped. */
  list: () => pb.collection("cycles").getFullList<Cycle>(),
};
