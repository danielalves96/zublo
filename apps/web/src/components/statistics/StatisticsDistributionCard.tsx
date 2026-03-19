import { useTranslation } from "react-i18next";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import { STATISTICS_COLORS } from "@/components/statistics/constants";
import type { StatisticsPieDatum } from "@/components/statistics/statistics.types";

interface StatisticsDistributionCardProps {
  data: StatisticsPieDatum[];
  mainSymbol: string;
  title: string;
}

export function StatisticsDistributionCard({
  data,
  mainSymbol,
  title,
}: StatisticsDistributionCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="overflow-hidden rounded-3xl border bg-card/40 shadow-sm backdrop-blur-md">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                label={({ name, percent }) =>
                  `${name} (${(percent * 100).toFixed(0)}%)`
                }
                labelLine={false}
              >
                {data.map((_, index) => (
                  <Cell
                    key={index}
                    fill={STATISTICS_COLORS[index % STATISTICS_COLORS.length]}
                    className="stroke-background stroke-[2px]"
                  />
                ))}
              </Pie>
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
                formatter={(value: number) => formatPrice(value, mainSymbol)}
              />
              <Legend wrapperStyle={{ paddingTop: "20px" }} />
            </PieChart>
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
