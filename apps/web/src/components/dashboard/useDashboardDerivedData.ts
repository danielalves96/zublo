import { useMemo } from "react";

import type { User } from "@/types";

interface SummaryData {
  totalMonthly: number;
  totalCredits?: number;
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
  const totalCredits = summary?.totalCredits ?? 0;
  const availableBudget = budget + totalCredits;
  const remaining = summary ? availableBudget - summary.totalMonthly : availableBudget;
  const budgetUsed =
    availableBudget > 0 && summary
      ? Math.min(100, (summary.totalMonthly / availableBudget) * 100)
      : 0;
  // There is nothing to be "over" until the user has a budget or a credit to
  // measure against — otherwise every account without a budget reads as
  // over-budget the moment it has a single expense.
  const isOverBudget = availableBudget > 0 && remaining < 0;

  return {
    budget,
    budgetUsed,
    remaining,
    totalCredits,
    chartData,
    isOverBudget,
  };
}
