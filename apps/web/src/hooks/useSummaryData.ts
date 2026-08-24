import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/lib/queryKeys";
import { currentMonthKey, isCredit, isDateInMonth } from "@/lib/recordTypes";
import { toMonthly } from "@/lib/utils";
import { currenciesService } from "@/services/currencies";
import { subscriptionsService } from "@/services/subscriptions";
import type { Subscription } from "@/types";

export function useSummaryData(userId: string) {
  // "Credits this month" is only correct relative to the month it was computed
  // in, so the month is part of the cache key: an app left open across a month
  // boundary refetches instead of serving last month's credits forever.
  const monthKey = currentMonthKey();

  return useQuery({
    queryKey: queryKeys.dashboard.forMonth(userId, monthKey),
    queryFn: async () => {
      const [subs, currencies] = await Promise.all([
        subscriptionsService.listActive(userId),
        currenciesService.list(userId),
      ]);

      const mainCurrency = currencies.find((c) => c.is_main);
      const mainRate = mainCurrency?.rate ?? 1;
      const mainSymbol = mainCurrency?.symbol ?? "$";

      let totalMonthly = 0;
      let totalCredits = 0;
      let expenseCount = 0;
      let mostExpensive: {
        id: string;
        name: string;
        monthly: number;
        logo?: string;
        record: Subscription;
      } | null = null;

      for (const sub of subs) {
        const currency = sub.expand?.currency;
        const rate = currency?.rate ?? 1;
        const priceMain = (sub.price / rate) * mainRate;

        if (isCredit(sub)) {
          if (isDateInMonth(sub.next_payment, new Date())) {
            totalCredits += priceMain;
          }
          continue;
        }

        expenseCount += 1;
        const cycleName = sub.expand?.cycle?.name ?? "Monthly";
        const monthly = toMonthly(sub.price, cycleName, sub.frequency || 1);
        const monthlyMain = (monthly / rate) * mainRate;
        totalMonthly += monthlyMain;

        if (!mostExpensive || monthlyMain > mostExpensive.monthly) {
          mostExpensive = {
            id: sub.id,
            name: sub.name,
            monthly: monthlyMain,
            logo: sub.logo,
            record: sub,
          };
        }
      }

      return {
        totalMonthly,
        totalYearly: totalMonthly * 12,
        totalWeekly: (totalMonthly * 12) / 52,
        totalDaily: (totalMonthly * 12) / 365,
        totalCredits,
        mainSymbol,
        // Credits are income, not subscriptions: counting them here would
        // disagree with every total on the same card, which excludes them.
        count: expenseCount,
        mostExpensive,
      };
    },
    enabled: !!userId,
  });
}
