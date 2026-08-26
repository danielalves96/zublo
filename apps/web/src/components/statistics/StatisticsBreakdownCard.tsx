import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { STATISTICS_COLORS } from "@/components/statistics/constants";
import type {
  StatisticsCategoryDetails,
  StatisticsPieDatum,
} from "@/components/statistics/statistics.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, formatPrice } from "@/lib/utils";

interface StatisticsBreakdownCardProps {
  data: StatisticsPieDatum[];
  mainSymbol: string;
  title: string;
  totalMonthly: number;
  categoryDetails?: StatisticsCategoryDetails;
}

export function StatisticsBreakdownCard({
  data,
  mainSymbol,
  title,
  totalMonthly,
  categoryDetails,
}: StatisticsBreakdownCardProps) {
  const { t } = useTranslation();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

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
          {data.map((item, index) => {
            const details = categoryDetails?.[item.name];
            const isExpandable = !!details?.length;
            const isExpanded = isExpandable && expandedCategory === item.name;
            const rowContent = (
              <>
                <div
                  className="h-4 w-4 shrink-0 rounded-full shadow-sm"
                  style={{
                    backgroundColor: STATISTICS_COLORS[index % STATISTICS_COLORS.length],
                  }}
                />
                <span className="flex-1 font-medium">{item.name}</span>
                <span className="font-bold tracking-tight">
                  {formatPrice(item.value, mainSymbol)}
                </span>
                <span className="rounded-lg bg-muted/50 px-2 py-0.5 text-sm font-medium text-muted-foreground">
                  {totalMonthly > 0 ? ((item.value / totalMonthly) * 100).toFixed(1) : 0}%
                </span>
                {isExpandable ? (
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isExpanded && "rotate-180",
                    )}
                  />
                ) : null}
              </>
            );

            return (
              <div key={item.name}>
                {isExpandable ? (
                  <button
                    type="button"
                    className="flex w-full cursor-pointer items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary"
                    aria-expanded={isExpanded}
                    aria-label={`${t("details")}: ${item.name}`}
                    onClick={() => setExpandedCategory(isExpanded ? null : item.name)}
                  >
                    {rowContent}
                  </button>
                ) : (
                  <div className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-muted/20">
                    {rowContent}
                  </div>
                )}

                {isExpanded ? (
                  <div className="border-t border-border/40 bg-muted/20 px-6 py-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {t("subscriptions")}
                    </p>
                    <div className="space-y-1.5">
                      {details?.map((detail) => (
                        <div
                          key={detail.id}
                          className="flex items-center justify-between gap-4 rounded-lg bg-background/60 px-3 py-2 text-sm"
                        >
                          <span className="min-w-0 truncate font-medium">{detail.name}</span>
                          <span className="shrink-0 font-mono font-semibold">
                            {formatPrice(detail.value, mainSymbol)}
                            <span className="ml-1 text-xs font-normal text-muted-foreground">
                              / {t("monthly").toLowerCase()}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
