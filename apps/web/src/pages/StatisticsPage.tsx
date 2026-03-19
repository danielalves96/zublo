import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { StatisticsBreakdownCard } from "@/components/statistics/StatisticsBreakdownCard";
import { StatisticsDistributionCard } from "@/components/statistics/StatisticsDistributionCard";
import { StatisticsHeader } from "@/components/statistics/StatisticsHeader";
import { StatisticsHistoryCard } from "@/components/statistics/StatisticsHistoryCard";
import { StatisticsSummaryCards } from "@/components/statistics/StatisticsSummaryCards";
import { useStatisticsDerivedData } from "@/components/statistics/useStatisticsDerivedData";
import type { StatisticsGroupBy } from "@/components/statistics/statistics.types";
import { subscriptionsService } from "@/services/subscriptions";
import { currenciesService } from "@/services/currencies";
import { yearlyCostsService } from "@/services/yearlyCosts";
import { queryKeys } from "@/lib/queryKeys";

export function StatisticsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [groupBy, setGroupBy] = useState<StatisticsGroupBy>("category");

  const { data: subs = [] } = useQuery({
    queryKey: queryKeys.subscriptions.all(userId),
    queryFn: () => subscriptionsService.listActiveExpanded(userId),
    enabled: !!userId,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: queryKeys.currencies.all(userId),
    queryFn: () => currenciesService.list(userId),
    enabled: !!userId,
  });

  const { data: yearlyCosts = [] } = useQuery({
    queryKey: queryKeys.yearlyCosts.all(userId),
    queryFn: () => yearlyCostsService.list(userId),
    enabled: !!userId,
  });

  const { lineData, mainSymbol, pieData, totalMonthly, totalYearly } =
    useStatisticsDerivedData({
      subscriptions: subs,
      currencies,
      yearlyCosts,
      groupBy,
    });

  const groupLabels: Record<StatisticsGroupBy, string> = {
    category: t("cost_by_category"),
    payment: t("cost_by_payment"),
    member: t("cost_by_member"),
  };
  const breakdownTitle = t(
    groupBy === "category"
      ? "categories"
      : groupBy === "payment"
        ? "payment_methods"
        : "household",
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <StatisticsHeader
        groupBy={groupBy}
        groupLabels={groupLabels}
        onGroupByChange={setGroupBy}
      />

      <StatisticsSummaryCards
        mainSymbol={mainSymbol}
        subscriptionsCount={subs.length}
        totalMonthly={totalMonthly}
        totalYearly={totalYearly}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StatisticsDistributionCard
          data={pieData}
          mainSymbol={mainSymbol}
          title={groupLabels[groupBy]}
        />
        <StatisticsHistoryCard data={lineData} mainSymbol={mainSymbol} />
      </div>

      <StatisticsBreakdownCard
        data={pieData}
        mainSymbol={mainSymbol}
        title={breakdownTitle}
        totalMonthly={totalMonthly}
      />
    </div>
  );
}
