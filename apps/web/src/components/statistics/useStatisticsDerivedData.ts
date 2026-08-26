import { useMemo } from "react";

import type {
  StatisticsCategoryDetails,
  StatisticsGroupBy,
  StatisticsHistoryPoint,
  StatisticsPieDatum,
} from "@/components/statistics/statistics.types";
import { isExpense } from "@/lib/recordTypes";
import { toMonthly } from "@/lib/utils";
import type { Currency, Subscription, YearlyCost } from "@/types";

interface UseStatisticsDerivedDataParams {
  subscriptions: Subscription[];
  currencies: Currency[];
  yearlyCosts: YearlyCost[];
  groupBy: StatisticsGroupBy;
}

export function useStatisticsDerivedData({
  subscriptions,
  currencies,
  yearlyCosts,
  groupBy,
}: UseStatisticsDerivedDataParams) {
  return useMemo(() => {
    const mainCurrency = currencies.find((currency) => currency.is_main);
    const mainRate = mainCurrency?.rate ?? 1;
    const mainSymbol = mainCurrency?.symbol ?? "$";

    const recurringSubscriptions = subscriptions.filter(isExpense).map((subscription) => {
      const currency = subscription.expand?.currency;
      const cycleName = subscription.expand?.cycle?.name ?? "Monthly";
      const monthly = toMonthly(subscription.price, cycleName, subscription.frequency || 1);
      const rate = currency?.rate ?? 1;
      const value = (monthly / rate) * mainRate;

      return {
        subscription,
        value,
      };
    });

    const groupedData = recurringSubscriptions.reduce<Record<string, number>>(
      (accumulator, { subscription, value }) => {
        let key = "Other";
        if (groupBy === "category" && subscription.expand?.category) {
          key = subscription.expand.category.name;
        } else if (groupBy === "payment" && subscription.expand?.payment_method) {
          key = subscription.expand.payment_method.name;
        } else if (groupBy === "member" && subscription.expand?.payer) {
          key = subscription.expand.payer.name;
        }

        accumulator[key] = (accumulator[key] || 0) + value;
        return accumulator;
      },
      {},
    );

    const categoryDetails = recurringSubscriptions.reduce<StatisticsCategoryDetails>(
      (accumulator, { subscription, value }) => {
        const categoryName = subscription.expand?.category?.name ?? "Other";
        const details = accumulator[categoryName] ?? [];

        details.push({
          id: subscription.id,
          name: subscription.name,
          value: Number(value.toFixed(2)),
        });
        accumulator[categoryName] = details;

        return accumulator;
      },
      {},
    );

    Object.values(categoryDetails).forEach((details) =>
      details.sort(
        (left, right) => right.value - left.value || left.name.localeCompare(right.name),
      ),
    );

    const pieData: StatisticsPieDatum[] = Object.entries(groupedData)
      .map(([name, value]) => ({
        name,
        value: Number(value.toFixed(2)),
      }))
      .sort((left, right) => right.value - left.value);

    const lineData: StatisticsHistoryPoint[] = yearlyCosts.slice(-12).map((point) => ({
      name: `${point.year}/${String(point.month).padStart(2, "0")}`,
      cost: Number(point.total.toFixed(2)),
    }));

    const totalMonthly = Object.values(groupedData).reduce((total, value) => total + value, 0);

    return {
      categoryDetails,
      lineData,
      mainSymbol,
      pieData,
      totalMonthly,
      totalYearly: totalMonthly * 12,
    };
  }, [currencies, groupBy, subscriptions, yearlyCosts]);
}
