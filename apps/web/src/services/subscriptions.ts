import pb from "@/lib/pb";
import { api } from "@/lib/api";
import type { Subscription } from "@/types";

const FULL_EXPAND = "currency,cycle,category,payment_method,payer";

export const subscriptionsService = {
  /** All subscriptions for a user (active + inactive), with full relations. */
  list: (userId: string) =>
    pb.collection("subscriptions").getFullList<Subscription>({
      filter: pb.filter("user = {:userId}", { userId }),
      expand: FULL_EXPAND,
    }),

  /** Only active subscriptions — used by dashboard summary. */
  listActive: (userId: string) =>
    pb.collection("subscriptions").getFullList<Subscription>({
      filter: pb.filter("user = {:userId} && inactive = false", { userId }),
      expand: "currency,cycle",
    }),

  /** Only active subscriptions with full expand — used by statistics. */
  listActiveExpanded: (userId: string) =>
    pb.collection("subscriptions").getFullList<Subscription>({
      filter: pb.filter("user = {:userId} && inactive = false", { userId }),
      expand: FULL_EXPAND,
    }),

  create: (data: FormData | Partial<Subscription>) =>
    pb.collection("subscriptions").create<Subscription>(data),

  update: (id: string, data: FormData | Partial<Subscription>) =>
    pb.collection("subscriptions").update<Subscription>(id, data),

  delete: (id: string) => pb.collection("subscriptions").delete(id),

  clone: (id: string) =>
    api.post<{ id: string }>("/api/subscription/clone", { id }),

  renew: (id: string) =>
    api.post<{ id: string }>("/api/subscription/renew", { id }),

  export: () =>
    api.get<{ subscriptions: unknown[] }>("/api/subscriptions/export"),

  import: (subscriptions: unknown[]) =>
    api.post<{ imported: number; skipped: number; errors: { index: number; name?: string; reason?: string; warning?: string }[] }>(
      "/api/subscriptions/import",
      { subscriptions }
    ),

  logoUrl: (sub: Subscription): string | null => {
    if (!sub.logo) return null;
    return pb.files.getUrl(
      { collectionId: "subscriptions", id: sub.id } as Parameters<typeof pb.files.getUrl>[0],
      sub.logo,
    );
  },
};
