import { useEffect, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { aiService } from "@/services/ai";
import { subscriptionsService } from "@/services/subscriptions";
import { yearlyCostsService } from "@/services/yearlyCosts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/lib/toast";
import { formatPrice, cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
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

// Extracted components and hooks
import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { useSummaryData } from "@/hooks/useSummaryData";
import { useYearlyCosts } from "@/hooks/useYearlyCosts";
import { useAIRecommendations } from "@/hooks/useAIRecommendations";

export function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  const summary = useSummaryData(userId);
  const yearlyCosts = useYearlyCosts(userId);
  const recommendations = useAIRecommendations(userId);

  const snapshotMut = useMutation({
    mutationFn: () => yearlyCostsService.snapshot(),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.yearlyCosts.all(userId) }),
  });
  const { mutate: takeSnapshot, isPending: snapshotPending, isSuccess: snapshotDone } = snapshotMut;

  useEffect(() => {
    if (yearlyCosts.data && yearlyCosts.data.length === 0 && !snapshotPending && !snapshotDone) {
      takeSnapshot();
    }
  }, [yearlyCosts.data, snapshotPending, snapshotDone, takeSnapshot]);

  const generateMutation = useMutation({
    mutationFn: () => aiService.generate(),
    onSuccess: () => {
      toast.success(t("success"));
      qc.invalidateQueries({ queryKey: queryKeys.aiRecommendations.all(userId) });
    },
    onError: (err: Error) => toast.error(t(err.message)),
  });

  const deleteRecommendation = useMutation({
    mutationFn: (id: string) => aiService.deleteRecommendation(id),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.aiRecommendations.all(userId) }),
  });

  const s = summary.data;
  const fmt = (v: number) => formatPrice(v, s?.mainSymbol ?? "$");

  const chartData = useMemo(
    () =>
      yearlyCosts.data?.slice(-12).map((yc) => ({
        name: `${yc.year}/${String(yc.month).padStart(2, "0")}`,
        cost: Number(yc.total.toFixed(2)),
      })) ?? [],
    [yearlyCosts.data],
  );

  const { budget, budgetUsed, isOverBudget } = useMemo(() => {
    const budget = user?.budget ?? 0;
    const budgetUsed = budget > 0 && s ? Math.min(100, (s.totalMonthly / budget) * 100) : 0;
    return { budget, budgetUsed, isOverBudget: budgetUsed >= 100 };
  }, [user?.budget, s]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
            {t("dashboard")}
          </h1>
          <p className="text-muted-foreground mt-1 text-lg">
            {t("welcome_back")}, <span className="font-semibold text-foreground">{user?.name || user?.email?.split('@')[0]}</span>. {t("financial_overview")}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-card border rounded-full px-4 py-2 shadow-sm text-sm font-medium">
          <Activity className="w-4 h-4 text-primary animate-pulse" />
          <span>{t("active_subscriptions")}: <span className="text-primary font-bold">{s?.count ?? 0}</span></span>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title={t("total_monthly")}
          value={s ? fmt(s.totalMonthly) : "—"}
          icon={<DollarSign className="h-6 w-6 text-blue-500" />}
          loading={summary.isLoading}

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
                      formatter={(val: number) => [fmt(val), t('cost')]}
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
            <CardTitle className="text-lg">{t("budget_overview")}</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-5 pt-6">
            {budget > 0 ? (
              <>
                <div className="flex justify-between items-end">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{t("budget_used")}</p>
                    <p className={`text-3xl font-bold tracking-tight ${isOverBudget ? 'text-destructive' : 'text-primary'}`}>
                      {s ? fmt(s.totalMonthly) : "—"}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm text-muted-foreground">{t("monthly_budget")}</p>
                    <p className="text-xl font-medium">{fmt(budget)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Progress
                    value={budgetUsed}
                    className={cn("h-3 rounded-full", isOverBudget && "[&>div]:bg-destructive")}
                  />
                  <div className="flex justify-between text-xs font-medium">
                    <span className={isOverBudget ? "text-destructive font-bold" : "text-muted-foreground"}>
                      {budgetUsed.toFixed(1)}% {t("budget_used").toLowerCase()}
                    </span>
                    {isOverBudget ? (
                      <span className="text-destructive font-bold">{t("budget_over")}</span>
                    ) : (
                      <span className="text-muted-foreground">
                        {t("budget_remaining")}: <span className="font-semibold text-foreground">{s ? fmt(budget - s.totalMonthly) : "—"}</span>
                      </span>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 py-4 flex-1 flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <DollarSign className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <p className="font-semibold text-lg">{t("no_budget_set")}</p>
                  <p className="text-sm text-muted-foreground">{t("budget_hint")}</p>
                </div>
              </div>
            )}

            {s?.mostExpensive && (
              <div className="px-3 py-3 bg-muted/40 rounded-xl flex items-center gap-3">
                <div className="h-9 w-9 shrink-0 rounded-xl overflow-hidden bg-background border shadow-sm flex items-center justify-center text-sm font-bold">
                  {s.mostExpensive.logo ? (
                    <img
                      src={subscriptionsService.logoUrl(s.mostExpensive.record) ?? ""}
                      alt={s.mostExpensive.name}
                      className="h-full w-full object-cover p-0.5 rounded-xl"
                    />
                  ) : (
                    <span className="bg-primary/10 text-primary w-full h-full flex items-center justify-center">
                      {s.mostExpensive.name[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{t("most_expensive_sub")}</p>
                  <p className="text-sm font-semibold text-foreground truncate">{s.mostExpensive.name}</p>
                </div>
                <span className="text-primary font-bold text-base shrink-0">{fmt(s.mostExpensive.monthly)}</span>
              </div>
            )}

            <div className="mt-auto border-t pt-4">
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
            <p className="text-sm text-muted-foreground">{t("ai_smart_insights")}</p>
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
              <p className="text-sm text-muted-foreground mt-1">{t("ai_generate_hint")}</p>
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
