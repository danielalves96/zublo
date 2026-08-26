import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";

import { SubscriptionCard } from "@/components/subscriptions/SubscriptionCard";
import type { Currency, Subscription } from "@/types";

function SubscriptionsLoadingGrid({ layout }: { layout: "grid" | "list" }) {
  if (layout === "list") {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5, 6].map((item) => (
          <div
            key={item}
            className="h-[4.5rem] animate-pulse rounded-xl border bg-card/40 backdrop-blur-sm"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3, 4, 5, 6].map((item) => (
        <div
          key={item}
          className="h-36 rounded-2xl border bg-card/40 animate-pulse backdrop-blur-sm"
        />
      ))}
    </div>
  );
}

function SubscriptionsEmptyState() {
  const { t } = useTranslation();

  return (
    <div className="rounded-2xl border border-dashed bg-card/30 p-12 text-center backdrop-blur-md">
      <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <Search className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <p className="text-lg font-medium text-foreground">{t("no_subscriptions")}</p>
      <p className="mt-1 text-muted-foreground">{t("no_subscriptions_hint")}</p>
    </div>
  );
}

interface SubscriptionsGridProps {
  isLoading: boolean;
  subscriptions: Subscription[];
  layout?: "grid" | "list";
  mainCurrency?: Currency;
  convertCurrency?: boolean;
  showMonthly?: boolean;
  showProgress?: boolean;
  onEdit: (subscription: Subscription) => void;
  onClone: (id: string) => void;
  onRenew: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SubscriptionsGrid({
  isLoading,
  subscriptions,
  layout = "grid",
  mainCurrency,
  convertCurrency,
  showMonthly,
  showProgress,
  onEdit,
  onClone,
  onRenew,
  onDelete,
}: SubscriptionsGridProps) {
  if (isLoading) {
    return <SubscriptionsLoadingGrid layout={layout} />;
  }

  if (subscriptions.length === 0) {
    return <SubscriptionsEmptyState />;
  }

  return (
    <div
      className={
        layout === "list" ? "space-y-2" : "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
      }
    >
      {subscriptions.map((subscription) => (
        <SubscriptionCard
          key={subscription.id}
          sub={subscription}
          layout={layout}
          mainCurrency={mainCurrency}
          convertCurrency={convertCurrency}
          showMonthly={showMonthly}
          showProgress={showProgress}
          onEdit={() => onEdit(subscription)}
          onClone={() => onClone(subscription.id)}
          onRenew={() => onRenew(subscription.id)}
          onDelete={() => onDelete(subscription.id)}
        />
      ))}
    </div>
  );
}
