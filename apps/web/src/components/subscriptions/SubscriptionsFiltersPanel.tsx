import { useTranslation } from "react-i18next";
import { Filter } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Category } from "@/types";
import type { SubscriptionFiltersState } from "@/components/subscriptions/subscriptionsPage.types";

interface SubscriptionsFiltersPanelProps {
  categories: Category[];
  filters: SubscriptionFiltersState;
  onChange: (filters: SubscriptionFiltersState) => void;
}

export function SubscriptionsFiltersPanel({
  categories,
  filters,
  onChange,
}: SubscriptionsFiltersPanelProps) {
  const { t } = useTranslation();

  const setStateFilter = (state: SubscriptionFiltersState["state"]) => {
    onChange({ ...filters, state });
  };

  const toggleCategory = (categoryId: string) => {
    onChange({
      ...filters,
      categories: filters.categories.includes(categoryId)
        ? filters.categories.filter((id) => id !== categoryId)
        : [...filters.categories, categoryId],
    });
  };

  return (
    <div className="animate-in slide-in-from-top-2 space-y-5 rounded-2xl border bg-card/40 p-5 shadow-sm fade-in backdrop-blur-md">
      <div className="space-y-3">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-foreground/80">
          <Filter className="h-3.5 w-3.5" />
          {t("state")}
        </h3>
        <div className="flex flex-wrap gap-2">
          {(["all", "active", "inactive"] as const).map((state) => (
            <button
              key={state}
              onClick={() => setStateFilter(state)}
              className={cn(
                "rounded-xl border px-4 py-1.5 text-sm font-medium transition-all duration-200",
                filters.state === state
                  ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                  : "border-transparent bg-background/50 text-muted-foreground hover:border-border hover:bg-accent/60",
              )}
            >
              {t(
                state === "all"
                  ? "all"
                  : state === "active"
                    ? "active"
                    : "inactive_label",
              )}
            </button>
          ))}
        </div>
      </div>

      {categories.length > 0 ? (
        <div className="space-y-3 border-t border-border/50 pt-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-foreground/80">
            {t("category")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => toggleCategory(category.id)}
                className={cn(
                  "rounded-xl border px-4 py-1.5 text-sm font-medium transition-all duration-200",
                  filters.categories.includes(category.id)
                    ? "border-primary bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/20"
                    : "border-transparent bg-background/50 text-muted-foreground hover:border-border hover:bg-accent/60",
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
