import pb from "@/lib/pb";
import type { Category } from "@/types";

export const categoriesService = {
  list: (userId: string) =>
    pb.collection("categories").getFullList<Category>({
      filter: pb.filter("user = {:userId}", { userId }),
      sort: "name",
    }),

  create: (userId: string, name: string) =>
    pb.collection("categories").create<Category>({ name, user: userId }),

  update: (id: string, name: string) =>
    pb.collection("categories").update<Category>(id, { name }),

  delete: (id: string) => pb.collection("categories").delete(id),
};
