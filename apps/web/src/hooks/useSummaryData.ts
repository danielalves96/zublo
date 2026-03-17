import { useQuery } from "@tanstack/react-query";
import pb from "@/lib/pb";
import { toMonthly } from "@/lib/utils";
import type { Subscription, Currency } from "@/types";

export function useSummaryData(userId: string) {
  return useQuery({
    queryKey: ["dashboard", userId],
    queryFn: async () => {
      const [subsResult, currenciesResult] = await Promise.all([
        pb.collection("subscriptions").getFullList<Subscription>({
          filter: `user = "${userId}" && inactive = false`,
          expand: "currency,cycle",
        }),
        pb.collection("currencies").getFullList<Currency>({
          filter: `user = "${userId}"`,
        }),
      ]);

      const mainCurrency = currenciesResult.find((c) => c.is_main);
      const mainRate = mainCurrency?.rate ?? 1;
      const mainSymbol = mainCurrency?.symbol ?? "$";

      let totalMonthly = 0;
      let mostExpensive: {
        id: string;
        name: string;
        monthly: number;
        logo?: string;
        record: Subscription;
      } | null = null;

      for (const sub of subsResult) {
        const currency = sub.expand?.currency;
        const cycleName = sub.expand?.cycle?.name ?? "Monthly";
        const price = sub.price;
        const freq = sub.frequency || 1;

        const monthly = toMonthly(price, cycleName, freq);
        const rate = currency?.rate ?? 1;
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
        mainSymbol,
        count: subsResult.length,
        mostExpensive,
      };
    },
    enabled: !!userId,
  });
}
