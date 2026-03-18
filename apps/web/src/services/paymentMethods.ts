import pb from "@/lib/pb";
import type { PaymentMethod } from "@/types";

export const paymentMethodsService = {
  list: (userId: string) =>
    pb.collection("payment_methods").getFullList<PaymentMethod>({
      filter: pb.filter("user = {:userId}", { userId }),
      sort: "order,name",
    }),

  /** Returns a sorted list for use in forms (sort by order). */
  listForForm: (userId: string) =>
    pb.collection("payment_methods").getFullList<PaymentMethod>({
      filter: pb.filter("user = {:userId}", { userId }),
      sort: "order",
    }),

  create: (data: FormData) =>
    pb.collection("payment_methods").create<PaymentMethod>(data),

  update: (id: string, data: FormData | Partial<PaymentMethod>) =>
    pb.collection("payment_methods").update<PaymentMethod>(id, data),

  delete: (id: string) => pb.collection("payment_methods").delete(id),

  iconUrl: (record: PaymentMethod) =>
    record.icon ? pb.files.getUrl(record, record.icon) : null,
};
