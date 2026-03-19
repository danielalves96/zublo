import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { STATISTICS_COLORS } from "@/components/statistics/constants";
import type { StatisticsPieDatum } from "@/components/statistics/statistics.types";

interface StatisticsBreakdownCardProps {
  data: StatisticsPieDatum[];
  mainSymbol: string;
  title: string;
  totalMonthly: number;
}

export function StatisticsBreakdownCard({
  data,
  mainSymbol,
  title,
  totalMonthly,
}: StatisticsBreakdownCardProps) {
  if (data.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden rounded-3xl border bg-card/40 shadow-sm backdrop-blur-md">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-border/50">
          {data.map((item, index) => (
            <div
              key={item.name}
              className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-muted/20"
            >
              <div
                className="h-4 w-4 shrink-0 rounded-full shadow-sm"
                style={{
                  backgroundColor:
                    STATISTICS_COLORS[index % STATISTICS_COLORS.length],
                }}
              />
              <span className="flex-1 font-medium">{item.name}</span>
              <span className="font-bold tracking-tight">
                {formatPrice(item.value, mainSymbol)}
              </span>
              <span className="rounded-lg bg-muted/50 px-2 py-0.5 text-sm font-medium text-muted-foreground">
                {totalMonthly > 0
                  ? ((item.value / totalMonthly) * 100).toFixed(1)
                  : 0}
                %
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
