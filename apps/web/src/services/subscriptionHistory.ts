import { api } from "@/lib/api";
import type { SubscriptionHistory } from "@/types";

export const subscriptionHistoryService = {
  /**
   * Change log plus spend totals for one subscription.
   *
   * The totals are computed on the backend from the same log, so the UI never
   * has to replay a billing schedule itself.
   */
  get: (subscriptionId: string) =>
    api.get<SubscriptionHistory>(
      `/api/subscription/history?id=${encodeURIComponent(subscriptionId)}`,
    ),
};
