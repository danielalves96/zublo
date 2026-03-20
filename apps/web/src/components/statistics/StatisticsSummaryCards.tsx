import { useTranslation } from "react-i18next";

import { Card, CardContent } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";

interface StatisticsSummaryCardsProps {
  mainSymbol: string;
  subscriptionsCount: number;
  totalMonthly: number;
  totalYearly: number;
}

export function StatisticsSummaryCards({
  mainSymbol,
  subscriptionsCount,
  totalMonthly,
  totalYearly,
}: StatisticsSummaryCardsProps) {
  const { t } = useTranslation();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <Card className="group relative overflow-hidden rounded-3xl border bg-card/40 shadow-sm backdrop-blur-md">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <CardContent className="relative p-6">
          <p className="text-sm font-medium text-muted-foreground">
            {t("total_monthly")}
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight">
            {formatPrice(totalMonthly, mainSymbol)}
          </p>
        </CardContent>
      </Card>

      <Card className="group relative overflow-hidden rounded-3xl border bg-card/40 shadow-sm backdrop-blur-md">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <CardContent className="relative p-6">
          <p className="text-sm font-medium text-muted-foreground">
            {t("total_yearly")}
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight">
            {formatPrice(totalYearly, mainSymbol)}
          </p>
        </CardContent>
      </Card>

      <Card className="group relative overflow-hidden rounded-3xl border bg-card/40 shadow-sm backdrop-blur-md">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
        <CardContent className="relative p-6">
          <p className="text-sm font-medium text-muted-foreground">
            {t("subscriptions")}
          </p>
          <p className="mt-2 text-3xl font-extrabold tracking-tight">
            {subscriptionsCount}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
