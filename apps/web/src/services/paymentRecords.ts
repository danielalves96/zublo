import pb from "@/lib/pb";
import type { PaymentRecord } from "@/types";

export const paymentRecordsService = {
  listForUser: (userId: string) =>
    pb.collection("payment_records").getFullList<PaymentRecord>({
      filter: pb.filter("user = {:userId}", { userId }),
    }),

  listForSubscription: (subscriptionId: string, userId: string) =>
    pb.collection("payment_records").getFullList<PaymentRecord>({
      filter: pb.filter("subscription_id = {:subscriptionId} && user = {:userId}", { subscriptionId, userId }),
    }),

  create: (data: FormData | Partial<PaymentRecord>) =>
    pb.collection("payment_records").create<PaymentRecord>(data),

  update: (id: string, data: FormData | Partial<PaymentRecord>) =>
    pb.collection("payment_records").update<PaymentRecord>(id, data),

  proofUrl: (record: PaymentRecord) =>
    record.proof
      ? pb.files.getUrl(
          { collectionId: "payment_records", id: record.id } as Parameters<
            typeof pb.files.getUrl
          >[0],
          record.proof,
        )
      : null,
};
