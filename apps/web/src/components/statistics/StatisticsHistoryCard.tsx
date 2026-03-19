import { useTranslation } from "react-i18next";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import type { StatisticsHistoryPoint } from "@/components/statistics/statistics.types";

interface StatisticsHistoryCardProps {
  data: StatisticsHistoryPoint[];
  mainSymbol: string;
}

export function StatisticsHistoryCard({
  data,
  mainSymbol,
}: StatisticsHistoryCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden rounded-3xl border bg-card/40 shadow-sm backdrop-blur-md">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <CardTitle className="text-lg">{t("cost_history")}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "1px solid hsl(var(--border))",
                  backgroundColor: "hsl(var(--card))",
                }}
                itemStyle={{
                  color: "hsl(var(--foreground))",
                  fontWeight: "bold",
                }}
                formatter={(value: number) => [formatPrice(value, mainSymbol), "Cost"]}
              />
              <Line
                type="monotone"
                dataKey="cost"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                dot={{ r: 4, fill: "hsl(var(--background))", strokeWidth: 2 }}
                activeDot={{ r: 6, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-[300px] items-center justify-center">
            <p className="rounded-full bg-muted/50 px-4 py-2 text-center text-sm text-muted-foreground">
              {t("no_results")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
