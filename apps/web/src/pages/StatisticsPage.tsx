import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionsService } from "@/services/subscriptions";
import { currenciesService } from "@/services/currencies";
import { yearlyCostsService } from "@/services/yearlyCosts";
import { queryKeys } from "@/lib/queryKeys";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice, toMonthly } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
} from "recharts";

const COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#ec4899",
  "#14b8a6",
];

type GroupBy = "category" | "payment" | "member";

export function StatisticsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const [groupBy, setGroupBy] = useState<GroupBy>("category");

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

  const mainCurrency = currencies.find((c) => c.is_main);
  const mainRate = mainCurrency?.rate ?? 1;
  const mainSymbol = mainCurrency?.symbol ?? "$";

  // Calculate grouped data for pie chart
  const groupedData = subs.reduce<Record<string, number>>((acc, sub) => {
    const currency = sub.expand?.currency;
    const cycleName = sub.expand?.cycle?.name ?? "Monthly";
    const monthly = toMonthly(sub.price, cycleName, sub.frequency || 1);
    const rate = currency?.rate ?? 1;
    const converted = (monthly / rate) * mainRate;

    let key = "Other";
    if (groupBy === "category" && sub.expand?.category) {
      key = sub.expand.category.name;
    } else if (groupBy === "payment" && sub.expand?.payment_method) {
      key = sub.expand.payment_method.name;
    } else if (groupBy === "member" && sub.expand?.payer) {
      key = sub.expand.payer.name;
    }

    acc[key] = (acc[key] || 0) + converted;
    return acc;
  }, {});

  const pieData = Object.entries(groupedData)
    .map(([name, value]) => ({
      name,
      value: Number(value.toFixed(2)),
    }))
    .sort((a, b) => b.value - a.value);

  const lineData = yearlyCosts.slice(-12).map((yc) => ({
    name: `${yc.year}/${String(yc.month).padStart(2, "0")}`,
    cost: Number(yc.total.toFixed(2)),
  }));

  // Totals
  const totalMonthly = Object.values(groupedData).reduce((a, b) => a + b, 0);

  const groupLabels: Record<GroupBy, string> = {
    category: t("cost_by_category"),
    payment: t("cost_by_payment"),
    member: t("cost_by_member"),
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t("statistics")}
          </h1>
          <p className="text-muted-foreground mt-1">Analyze your spending across categories, members, and more.</p>
        </div>
        
        {/* Group by selector */}
        <div className="flex bg-card/40 backdrop-blur-md p-1 rounded-2xl border shadow-sm">
          {(["category", "payment", "member"] as GroupBy[]).map((g) => (
            <button
              key={g}
              onClick={() => setGroupBy(g)}
              className={cn(
                "text-sm font-medium rounded-xl px-4 py-2 transition-all duration-200 capitalize",
                groupBy === g
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              {groupLabels[g]}
            </button>
          ))}
        </div>
      </div>

      {/* Totals */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="shadow-sm border bg-card/40 backdrop-blur-md rounded-3xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 relative">
            <p className="text-sm font-medium text-muted-foreground">
              {t("total_monthly")}
            </p>
            <p className="text-3xl font-extrabold mt-2 tracking-tight">
              {formatPrice(totalMonthly, mainSymbol)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border bg-card/40 backdrop-blur-md rounded-3xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 relative">
            <p className="text-sm font-medium text-muted-foreground">{t("total_yearly")}</p>
            <p className="text-3xl font-extrabold mt-2 tracking-tight">
              {formatPrice(totalMonthly * 12, mainSymbol)}
            </p>
          </CardContent>
        </Card>
        <Card className="shadow-sm border bg-card/40 backdrop-blur-md rounded-3xl overflow-hidden relative group">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardContent className="p-6 relative">
            <p className="text-sm font-medium text-muted-foreground">
              {t("subscriptions")}
            </p>
            <p className="text-3xl font-extrabold mt-2 tracking-tight">{subs.length}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie chart */}
        <Card className="shadow-sm border bg-card/40 backdrop-blur-md rounded-3xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg">{groupLabels[groupBy]}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
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
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} className="stroke-background stroke-[2px]" />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                    formatter={(val: number) => formatPrice(val, mainSymbol)}
                  />
                  <Legend wrapperStyle={{ paddingTop: "20px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-sm text-center text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
                  {t("no_results")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Line chart */}
        <Card className="shadow-sm border bg-card/40 backdrop-blur-md rounded-3xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg">{t("cost_history")}</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {lineData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={lineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                    contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', backgroundColor: 'hsl(var(--card))' }}
                    itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 'bold' }}
                    formatter={(val: number) => [formatPrice(val, mainSymbol), 'Cost']}
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
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-sm text-center text-muted-foreground bg-muted/50 px-4 py-2 rounded-full">
                  {t("no_results")}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdown table */}
      {pieData.length > 0 && (
        <Card className="shadow-sm border bg-card/40 backdrop-blur-md rounded-3xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg">
              {t(
                groupBy === "category"
                  ? "categories"
                  : groupBy === "payment"
                    ? "payment_methods"
                    : "household",
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {pieData.map((item, i) => (
                <div key={item.name} className="flex items-center gap-4 px-6 py-4 hover:bg-muted/20 transition-colors">
                  <div
                    className="h-4 w-4 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: COLORS[i % COLORS.length] }}
                  />
                  <span className="flex-1 font-medium">{item.name}</span>
                  <span className="font-bold tracking-tight">
                    {formatPrice(item.value, mainSymbol)}
                  </span>
                  <span className="text-sm font-medium text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-lg">
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
      )}
    </div>
  );
}
