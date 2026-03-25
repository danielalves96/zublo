import { useMemo } from "react";

import type {
  SubscriptionFiltersState,
  SubscriptionSortKey,
} from "@/components/subscriptions/subscriptionsPage.types";
import type { Subscription } from "@/types";

interface UseFilteredSubscriptionsParams {
  subscriptions: Subscription[];
  searchTerm: string;
  filters: SubscriptionFiltersState;
  sort: SubscriptionSortKey;
  sortDir: "asc" | "desc";
  disabledToBottom?: boolean;
}

export function useFilteredSubscriptions({
  subscriptions,
  searchTerm,
  filters,
  sort,
  sortDir,
  disabledToBottom,
}: UseFilteredSubscriptionsParams) {
  return useMemo(() => {
    let result = [...subscriptions];

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      result = result.filter((subscription) =>
        subscription.name.toLowerCase().includes(query),
      );
    }

    if (filters.state === "active") {
      result = result.filter((subscription) => !subscription.inactive);
    } else if (filters.state === "inactive") {
      result = result.filter((subscription) => subscription.inactive);
    }

    if (filters.categories.length > 0) {
      result = result.filter((subscription) =>
        filters.categories.includes(subscription.category ?? ""),
      );
    }

    if (filters.members.length > 0) {
      result = result.filter((subscription) =>
        filters.members.includes(subscription.payer ?? ""),
      );
    }

    if (filters.payments.length > 0) {
      result = result.filter((subscription) =>
        filters.payments.includes(subscription.payment_method ?? ""),
      );
    }

    result.sort((left, right) => {
      let comparison = 0;

      if (sort === "name") {
        comparison = left.name.localeCompare(right.name);
      } else if (sort === "price") {
        comparison = left.price - right.price;
      } else if (sort === "date") {
        comparison = (left.next_payment || "").localeCompare(
          right.next_payment || "",
        );
      } else if (sort === "status") {
        comparison = Number(left.inactive) - Number(right.inactive);
      }

      return sortDir === "asc" ? comparison : -comparison;
    });

    if (disabledToBottom) {
      result.sort((left, right) => Number(left.inactive) - Number(right.inactive));
    }

    return result;
  }, [subscriptions, searchTerm, filters, sort, sortDir, disabledToBottom]);
}
