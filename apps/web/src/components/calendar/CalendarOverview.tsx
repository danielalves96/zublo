import { AlertTriangle, Clock, RefreshCw, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { StatCard } from "@/components/calendar/StatCard";
import { formatPrice } from "@/lib/utils";
import type { Currency } from "@/types";

interface CalendarOverviewProps {
  count: number;
  total: number;
  due: number;
  loading: boolean;
  budget: number;
  overBudget: boolean;
  mainCurrency?: Currency;
}

export function CalendarOverview({
  count,
  total,
  due,
  loading,
  budget,
  overBudget,
  mainCurrency,
}: CalendarOverviewProps) {
  const { t } = useTranslation();
  const currencySymbol = mainCurrency?.symbol ?? "$";

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          icon={<RefreshCw className="h-5 w-5" />}
          iconClass="bg-primary/20 text-primary"
          label={t("subscriptions")}
          value={String(count)}
          loading={loading}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          iconClass="bg-blue-500/20 text-blue-500"
          label={t("total")}
          value={formatPrice(total, currencySymbol)}
          loading={loading}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          iconClass="bg-amber-500/20 text-amber-500"
          label={t("due")}
          value={formatPrice(due, currencySymbol)}
          loading={loading}
        />
      </div>

      {overBudget ? (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {t("over_budget_warning")}{" "}
            <strong>{formatPrice(total - budget, currencySymbol)}</strong>
          </span>
        </div>
      ) : null}
    </>
  );
}
