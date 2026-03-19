import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { SubscriptionCard } from "@/components/subscriptions/SubscriptionCard";
import type { Currency, Subscription } from "@/types";

function SubscriptionsLoadingGrid() {
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
      <p className="text-lg font-medium text-foreground">
        {t("no_subscriptions")}
      </p>
      <p className="mt-1 text-muted-foreground">{t("no_subscriptions_hint")}</p>
    </div>
  );
}

interface SubscriptionsGridProps {
  isLoading: boolean;
  subscriptions: Subscription[];
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
    return <SubscriptionsLoadingGrid />;
  }

  if (subscriptions.length === 0) {
    return <SubscriptionsEmptyState />;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
      {subscriptions.map((subscription) => (
        <SubscriptionCard
          key={subscription.id}
          sub={subscription}
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
