import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import pb from "@/lib/pb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/lib/toast";
import { formatPrice, toMonthly, cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type {
  Subscription,
  Currency,
  YearlyCost,
  AIRecommendation,
} from "@/types";
import {
  Sparkles,
  Trash2,
  TrendingUp,
  DollarSign,
  Calendar,
  BarChart2,
  Activity,
  ArrowRight,
} from "lucide-react";

function useSummaryData(userId: string) {
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
      for (const sub of subsResult) {
        const currency = sub.expand?.currency;
        const cycleName = sub.expand?.cycle?.name ?? "Monthly";
        const price = sub.price;
        const freq = sub.frequency || 1;

        const monthly = toMonthly(price, cycleName, freq);
        const rate = currency?.rate ?? 1;
        totalMonthly += (monthly / rate) * mainRate;
      }

      return {
        totalMonthly,
        totalYearly: totalMonthly * 12,
        totalWeekly: (totalMonthly * 12) / 52,
        totalDaily: (totalMonthly * 12) / 365,
        mainSymbol,
        count: subsResult.length,
      };
    },
    enabled: !!userId,
  });
}

function useYearlyCosts(userId: string) {
  return useQuery({
    queryKey: ["yearly-costs", userId],
    queryFn: async () => {
      const records = await pb
        .collection("yearly_costs")
        .getFullList<YearlyCost>({
          filter: `user = "${userId}"`,
          sort: "year,month",
        });
      return records;
    },
    enabled: !!userId,
  });
}

function useAIRecommendations(userId: string) {
  return useQuery({
    queryKey: ["ai-recommendations", userId],
    queryFn: async () => {
      const records = await pb
        .collection("ai_recommendations")
        .getFullList<AIRecommendation>({
          filter: `user = "${userId}"`,
        });
      return records;
    },
    enabled: !!userId,
  });
}

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  const summary = useSummaryData(userId);
  const yearlyCosts = useYearlyCosts(userId);
  const recommendations = useAIRecommendations(userId);

  const generateMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pb.authStore.token}`,
        },
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast.success(t("success"));
      qc.invalidateQueries({ queryKey: ["ai-recommendations", userId] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteRecommendation = useMutation({
    mutationFn: (id: string) => pb.collection("ai_recommendations").delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ai-recommendations", userId] }),
  });

  const s = summary.data;
  const fmt = (v: number) => formatPrice(v, s?.mainSymbol ?? "$");

  const chartData =
    yearlyCosts.data?.slice(-12).map((yc) => ({
      name: `${yc.year}/${String(yc.month).padStart(2, "0")}`,
      cost: Number(yc.total.toFixed(2)),
    })) ?? [];

  const budget = user?.budget ?? 0;
  const budgetUsed = budget > 0 && s ? Math.min(100, (s.totalMonthly / budget) * 100) : 0;
  const isOverBudget = budgetUsed >= 100;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header section with Welcome text */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
            {t("dashboard")}
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            Welcome back, <span className="font-semibold text-foreground">{user?.name || user?.email?.split('@')[0]}</span>. Here's your financial overview.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card border rounded-full px-4 py-2 shadow-sm text-sm font-medium">
          <Activity className="w-4 h-4 text-primary animate-pulse" />
          <span>Active Subscriptions: <span className="text-primary font-bold">{s?.count ?? 0}</span></span>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title={t("total_monthly")}
          value={s ? fmt(s.totalMonthly) : "—"}
          icon={<DollarSign className="h-6 w-6 text-blue-500" />}
          loading={summary.isLoading}
          trend="+2.5%"
          trendUp={false}
          gradient="from-blue-500/10 to-transparent border-blue-500/20"
        />
        <SummaryCard
          title={t("total_yearly")}
          value={s ? fmt(s.totalYearly) : "—"}
          icon={<Calendar className="h-6 w-6 text-green-500" />}
          loading={summary.isLoading}
          gradient="from-green-500/10 to-transparent border-green-500/20"
        />
        <SummaryCard
          title={t("total_weekly")}
          value={s ? fmt(s.totalWeekly) : "—"}
          icon={<TrendingUp className="h-6 w-6 text-purple-500" />}
          loading={summary.isLoading}
          gradient="from-purple-500/10 to-transparent border-purple-500/20"
        />
        <SummaryCard
          title={t("total_daily")}
          value={s ? fmt(s.totalDaily) : "—"}
          icon={<BarChart2 className="h-6 w-6 text-orange-500" />}
          loading={summary.isLoading}
          gradient="from-orange-500/10 to-transparent border-orange-500/20"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Cost history chart */}
        <Card className="lg:col-span-2 shadow-sm rounded-3xl overflow-hidden border">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              {t("cost_history")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {chartData.length > 0 ? (
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.2} />
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
                      formatter={(val: number) => [fmt(val), 'Cost']}
                    />
                    <Area
                      type="monotone"
                      dataKey="cost"
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#colorCost)"
                      activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[280px] text-muted-foreground">
                <BarChart2 className="w-12 h-12 opacity-20 mb-4" />
                <p>{t("no_results")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Budget widget */}
        <Card className="rounded-3xl shadow-sm border overflow-hidden flex flex-col">
          <CardHeader className="bg-muted/30 border-b pb-4">
            <CardTitle className="text-lg">{t("budget")} Overview</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-center space-y-6 pt-6">
            {budget > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t("budget_used")}</p>
                    <p className={`text-3xl font-bold tracking-tight ${isOverBudget ? 'text-destructive' : 'text-primary'}`}>
                      {s ? fmt(s.totalMonthly) : "—"}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm text-muted-foreground">Limit</p>
                    <p className="text-xl font-medium">{fmt(budget)}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Progress 
                    value={budgetUsed} 
                    className={cn("h-3 rounded-full", isOverBudget && "[&>div]:bg-destructive")} 
                  />
                  <div className="flex justify-between text-xs font-medium">
                    <span className={isOverBudget ? "text-destructive" : "text-muted-foreground"}>
                      {budgetUsed.toFixed(1)}% {t("budget_used").toLowerCase()}
                    </span>
                    {isOverBudget && (
                      <span className="text-destructive flex items-center gap-1">
                         Over Budget!
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4 py-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto text-primary">
                  <DollarSign className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-lg">No Budget Set</p>
                  <p className="text-sm text-muted-foreground">Set a monthly budget in Settings to keep your spending in check.</p>
                </div>
              </div>
            )}
            
            <div className="mt-auto pt-6 border-t">
              <div className="flex justify-between items-center px-2 py-3 bg-muted/40 rounded-xl">
                <span className="text-sm font-medium">{t("subscriptions")}</span>
                <span className="font-bold text-lg text-primary">{s?.count ?? "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Recommendations */}
      <Card className="rounded-3xl shadow-sm border overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-transparent border-b pb-4">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-yellow-500" />
              {t("ai_recommendations")}
            </CardTitle>
            <p className="text-sm text-muted-foreground">Smart insights to help you save money.</p>
          </div>
          <Button
            className="rounded-xl shadow-md border border-yellow-500/20 bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20 hover:text-yellow-700 dark:text-yellow-400 dark:hover:text-yellow-300 transition-all font-semibold"
            size="sm"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? t("loading") : (
              <span className="flex items-center gap-2">
                {t("generate_recommendations")} <ArrowRight className="w-4 h-4" />
              </span>
            )}
          </Button>
        </CardHeader>
        <CardContent className="pt-6">
          {recommendations.isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-24 bg-muted/30 animate-pulse rounded-2xl" />)}
            </div>
          ) : recommendations.data?.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-10 h-10 text-yellow-500/30 mx-auto mb-3" />
              <p className="text-muted-foreground">
                {t("no_recommendations")}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Generate new AI insights to discover savings.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendations.data?.map((rec) => (
                <div key={rec.id} className="relative group rounded-2xl border p-5 bg-card hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col h-full">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-yellow-500/10 to-transparent rounded-bl-full -z-10" />
                  
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h4 className="text-base font-bold leading-tight line-clamp-2">{rec.title}</h4>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                      onClick={() => deleteRecommendation.mutate(rec.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground flex-1 mb-4 leading-relaxed">
                    {rec.description}
                  </p>
                  {rec.savings && (
                    <div className="mt-auto inline-flex items-center gap-1.5 bg-green-500/10 text-green-600 dark:text-green-400 px-3 py-1.5 rounded-lg text-sm font-semibold w-fit">
                      <TrendingUp className="w-4 h-4" />
                      {t("savings")}: {rec.savings}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  loading,
  trend,
  trendUp,
  gradient
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  loading?: boolean;
  trend?: string;
  trendUp?: boolean;
  gradient: string;
}) {
  return (
    <Card className={`overflow-hidden relative rounded-3xl border bg-gradient-to-br ${gradient} shadow-sm hover:shadow-md transition-all`}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="p-3 bg-background/50 backdrop-blur-sm rounded-2xl shadow-sm">
            {icon}
          </div>
          {trend && (
            <span className={`text-xs font-bold px-2.5 py-1 flex items-center gap-1 rounded-full ${trendUp !== false ? 'bg-green-500/20 text-green-600' : 'bg-red-500/20 text-red-600'}`}>
              <TrendingUp className={`w-3 h-3 ${trendUp === false && 'rotate-180'}`} />
              {trend}
            </span>
          )}
        </div>
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded-lg bg-background/60" />
          ) : (
            <p className="text-3xl font-extrabold tracking-tight">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

