import { useTranslation } from "react-i18next";
import { ArrowUpDown, Filter, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SubscriptionsToolbarProps {
  searchTerm: string;
  showFilters: boolean;
  onSearchChange: (value: string) => void;
  onToggleFilters: () => void;
  onCycleSort: () => void;
}

export function SubscriptionsToolbar({
  searchTerm,
  showFilters,
  onSearchChange,
  onToggleFilters,
  onCycleSort,
}: SubscriptionsToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-2 rounded-2xl border bg-card/40 p-2 shadow-sm backdrop-blur-md md:flex-row">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={`${t("search")}...`}
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-11 border-transparent bg-background/50 pl-10 text-base placeholder:text-muted-foreground/60 focus-visible:ring-1 focus-visible:ring-primary/50"
        />
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          className={cn(
            "h-11 gap-2 border-transparent bg-background/50 px-4 hover:bg-accent/50",
            showFilters && "border-border bg-accent/80",
          )}
          onClick={onToggleFilters}
        >
          <Filter
            className={cn(
              "h-4 w-4",
              showFilters ? "text-primary" : "text-muted-foreground",
            )}
          />
          <span className="hidden sm:inline">{t("filter")}</span>
        </Button>

        <Button
          variant="outline"
          className="h-11 gap-2 border-transparent bg-background/50 px-4 hover:bg-accent/50"
          onClick={onCycleSort}
        >
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          <span className="hidden sm:inline">{t("sort")}</span>
        </Button>
      </div>
    </div>
  );
}
