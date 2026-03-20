import { useTranslation } from "react-i18next";

import { STATISTICS_GROUPS } from "@/components/statistics/constants";
import type { StatisticsGroupBy } from "@/components/statistics/statistics.types";
import { cn } from "@/lib/utils";

interface StatisticsHeaderProps {
  groupBy: StatisticsGroupBy;
  groupLabels: Record<StatisticsGroupBy, string>;
  onGroupByChange: (value: StatisticsGroupBy) => void;
}

export function StatisticsHeader({
  groupBy,
  groupLabels,
  onGroupByChange,
}: StatisticsHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
          {t("statistics")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          Analyze your spending across categories, members, and more.
        </p>
      </div>

      <div className="flex rounded-2xl border bg-card/40 p-1 shadow-sm backdrop-blur-md">
        {STATISTICS_GROUPS.map((value) => (
          <button
            key={value}
            onClick={() => onGroupByChange(value)}
            className={cn(
              "rounded-xl px-4 py-2 text-sm font-medium capitalize transition-all duration-200",
              groupBy === value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            {groupLabels[value]}
          </button>
        ))}
      </div>
    </div>
  );
}
