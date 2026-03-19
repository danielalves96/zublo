import { useMemo } from "react";
import type { User } from "@/types";

interface SummaryData {
  totalMonthly: number;
}

interface YearlyCostPoint {
  year: number;
  month: number;
  total: number;
}

interface UseDashboardDerivedDataParams {
  user: User | null | undefined;
  summary?: SummaryData;
  yearlyCosts?: YearlyCostPoint[];
}

export function useDashboardDerivedData({
  user,
  summary,
  yearlyCosts,
}: UseDashboardDerivedDataParams) {
  const chartData = useMemo(
    () =>
      yearlyCosts?.slice(-12).map((point) => ({
        name: `${point.year}/${String(point.month).padStart(2, "0")}`,
        cost: Number(point.total.toFixed(2)),
      })) ?? [],
    [yearlyCosts],
  );

  const budget = user?.budget ?? 0;
  const budgetUsed =
    budget > 0 && summary
      ? Math.min(100, (summary.totalMonthly / budget) * 100)
      : 0;
  const isOverBudget = budgetUsed >= 100;

  return {
    budget,
    budgetUsed,
    chartData,
    isOverBudget,
  };
}
