import pb from "@/lib/pb";
import type { Currency } from "@/types";

export const currenciesService = {
  list: (userId: string) =>
    pb.collection("currencies").getFullList<Currency>({
      filter: pb.filter("user = {:userId}", { userId }),
      sort: "-is_main,name",
    }),

  listMain: (userId: string) =>
    pb.collection("currencies").getFullList<Currency>({
      filter: pb.filter("user = {:userId} && is_main = true", { userId }),
    }),

  create: (userId: string, data: Partial<Currency>) =>
    pb.collection("currencies").create<Currency>({ ...data, user: userId, rate: data.rate ?? 1 }),

  update: (id: string, data: Partial<Currency>) =>
    pb.collection("currencies").update<Currency>(id, data),

  delete: (id: string) => pb.collection("currencies").delete(id),
};
