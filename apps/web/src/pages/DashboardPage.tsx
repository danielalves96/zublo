import { useMutation, useQueryClient } from "@tanstack/react-query";
import { BarChart2, Calendar, DollarSign, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

import { AIRecommendationsCard } from "@/components/dashboard/AIRecommendationsCard";
import { BudgetOverviewCard } from "@/components/dashboard/BudgetOverviewCard";
import { CostHistoryCard } from "@/components/dashboard/CostHistoryCard";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { useDashboardDerivedData } from "@/components/dashboard/useDashboardDerivedData";
import { useAuth } from "@/contexts/AuthContext";
import { useAIRecommendations } from "@/hooks/useAIRecommendations";
import { useSummaryData } from "@/hooks/useSummaryData";
import { useYearlyCosts } from "@/hooks/useYearlyCosts";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { formatPrice } from "@/lib/utils";
import { aiService } from "@/services/ai";
import { yearlyCostsService } from "@/services/yearlyCosts";

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  const summary = useSummaryData(userId);
  const yearlyCosts = useYearlyCosts(userId);
  const recommendations = useAIRecommendations(userId);

  const snapshotMutation = useMutation({
    mutationFn: () => yearlyCostsService.snapshot(),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.yearlyCosts.all(userId),
      }),
  });

  const { mutate: takeSnapshot, isPending: snapshotPending, isSuccess: snapshotDone } =
    snapshotMutation;

  useEffect(() => {
    if (
      yearlyCosts.data &&
      yearlyCosts.data.length === 0 &&
      !snapshotPending &&
      !snapshotDone
    ) {
      takeSnapshot();
    }
  }, [yearlyCosts.data, snapshotPending, snapshotDone, takeSnapshot]);

  const generateMutation = useMutation({
    mutationFn: () => aiService.generate(),
    onSuccess: () => {
      toast.success(t("success"));
      queryClient.invalidateQueries({
        queryKey: queryKeys.aiRecommendations.all(userId),
      });
    },
    onError: (error: Error) => toast.error(t(error.message)),
  });

  const deleteRecommendationMutation = useMutation({
    mutationFn: (id: string) => aiService.deleteRecommendation(id),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: queryKeys.aiRecommendations.all(userId),
      }),
  });

  const summaryData = summary.data;
  const formatValue = (value: number) =>
    formatPrice(value, summaryData?.mainSymbol ?? "$");

  const { budget, budgetUsed, chartData, isOverBudget } =
    useDashboardDerivedData({
      user,
      summary: summaryData,
      yearlyCosts: yearlyCosts.data,
    });

  const userName = user?.name || user?.email?.split("@")[0] || "—";

  return (
    <div className="animate-in slide-in-from-bottom-4 space-y-8 fade-in duration-500">
      <DashboardHeader
        userName={userName}
        activeSubscriptions={summaryData?.count ?? 0}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title={t("total_monthly")}
          value={summaryData ? formatValue(summaryData.totalMonthly) : "—"}
          icon={<DollarSign className="h-6 w-6 text-blue-500" />}
          loading={summary.isLoading}
          gradient="from-blue-500/10 to-transparent border-blue-500/20"
        />
        <SummaryCard
          title={t("total_yearly")}
          value={summaryData ? formatValue(summaryData.totalYearly) : "—"}
          icon={<Calendar className="h-6 w-6 text-green-500" />}
          loading={summary.isLoading}
          gradient="from-green-500/10 to-transparent border-green-500/20"
        />
        <SummaryCard
          title={t("total_weekly")}
          value={summaryData ? formatValue(summaryData.totalWeekly) : "—"}
          icon={<TrendingUp className="h-6 w-6 text-purple-500" />}
          loading={summary.isLoading}
          gradient="from-purple-500/10 to-transparent border-purple-500/20"
        />
        <SummaryCard
          title={t("total_daily")}
          value={summaryData ? formatValue(summaryData.totalDaily) : "—"}
          icon={<BarChart2 className="h-6 w-6 text-orange-500" />}
          loading={summary.isLoading}
          gradient="from-orange-500/10 to-transparent border-orange-500/20"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <CostHistoryCard data={chartData} formatValue={formatValue} />

        <BudgetOverviewCard
          budget={budget}
          budgetUsed={budgetUsed}
          isOverBudget={isOverBudget}
          totalMonthly={summaryData?.totalMonthly}
          subscriptionsCount={summaryData?.count}
          mostExpensive={summaryData?.mostExpensive}
          formatValue={formatValue}
        />
      </div>

      <AIRecommendationsCard
        recommendations={recommendations.data}
        isLoading={recommendations.isLoading}
        isGenerating={generateMutation.isPending}
        onGenerate={() => generateMutation.mutate()}
        onDelete={(id) => deleteRecommendationMutation.mutate(id)}
      />
    </div>
  );
}
