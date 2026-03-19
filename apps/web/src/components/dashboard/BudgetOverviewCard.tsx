import { useTranslation } from "react-i18next";
import { DollarSign } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { subscriptionsService } from "@/services/subscriptions";
import type { Subscription } from "@/types";

interface MostExpensiveSubscription {
  name: string;
  monthly: number;
  logo?: string;
  record: Subscription;
}

interface BudgetOverviewCardProps {
  budget: number;
  budgetUsed: number;
  isOverBudget: boolean;
  totalMonthly?: number;
  subscriptionsCount?: number;
  mostExpensive?: MostExpensiveSubscription | null;
  formatValue: (value: number) => string;
}

export function BudgetOverviewCard({
  budget,
  budgetUsed,
  isOverBudget,
  totalMonthly,
  subscriptionsCount,
  mostExpensive,
  formatValue,
}: BudgetOverviewCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="flex flex-col overflow-hidden rounded-3xl border shadow-sm">
      <CardHeader className="border-b bg-muted/30 pb-4">
        <CardTitle className="text-lg">{t("budget_overview")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-5 pt-6">
        {budget > 0 ? (
          <>
            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">{t("budget_used")}</p>
                <p
                  className={cn(
                    "text-3xl font-bold tracking-tight",
                    isOverBudget ? "text-destructive" : "text-primary",
                  )}
                >
                  {typeof totalMonthly === "number" ? formatValue(totalMonthly) : "—"}
                </p>
              </div>
              <div className="space-y-1 text-right">
                <p className="text-sm text-muted-foreground">
                  {t("monthly_budget")}
                </p>
                <p className="text-xl font-medium">{formatValue(budget)}</p>
              </div>
            </div>

            <div className="space-y-2">
              <Progress
                value={budgetUsed}
                className={cn(
                  "h-3 rounded-full",
                  isOverBudget && "[&>div]:bg-destructive",
                )}
              />
              <div className="flex justify-between text-xs font-medium">
                <span
                  className={cn(
                    isOverBudget
                      ? "font-bold text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {budgetUsed.toFixed(1)}% {t("budget_used").toLowerCase()}
                </span>
                {isOverBudget ? (
                  <span className="font-bold text-destructive">
                    {t("budget_over")}
                  </span>
                ) : (
                  <span className="text-muted-foreground">
                    {t("budget_remaining")}:{" "}
                    <span className="font-semibold text-foreground">
                      {typeof totalMonthly === "number"
                        ? formatValue(budget - totalMonthly)
                        : "—"}
                    </span>
                  </span>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center space-y-4 py-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <DollarSign className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <p className="text-lg font-semibold">{t("no_budget_set")}</p>
              <p className="text-sm text-muted-foreground">{t("budget_hint")}</p>
            </div>
          </div>
        )}

        {mostExpensive ? (
          <div className="flex items-center gap-3 rounded-xl bg-muted/40 px-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background text-sm font-bold shadow-sm">
              {mostExpensive.logo ? (
                <img
                  src={subscriptionsService.logoUrl(mostExpensive.record) ?? ""}
                  alt={mostExpensive.name}
                  className="h-full w-full rounded-xl object-cover p-0.5"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                  {mostExpensive.name[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {t("most_expensive_sub")}
              </p>
              <p className="truncate text-sm font-semibold text-foreground">
                {mostExpensive.name}
              </p>
            </div>
            <span className="shrink-0 text-base font-bold text-primary">
              {formatValue(mostExpensive.monthly)}
            </span>
          </div>
        ) : null}

        <div className="mt-auto border-t pt-4">
          <div className="flex items-center justify-between rounded-xl bg-muted/40 px-2 py-3">
            <span className="text-sm font-medium">{t("subscriptions")}</span>
            <span className="text-lg font-bold text-primary">
              {subscriptionsCount ?? "—"}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
