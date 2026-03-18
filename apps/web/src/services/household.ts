import pb from "@/lib/pb";
import type { Household } from "@/types";

export const householdService = {
  list: (userId: string) =>
    pb.collection("household").getFullList<Household>({
      filter: `user = "${userId}"`,
      sort: "name",
    }),

  create: (userId: string, name: string) =>
    pb.collection("household").create<Household>({ name, user: userId }),

  update: (id: string, name: string) =>
    pb.collection("household").update<Household>(id, { name }),

  delete: (id: string) => pb.collection("household").delete(id),
};
