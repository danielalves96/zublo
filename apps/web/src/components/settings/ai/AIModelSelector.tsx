import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, RefreshCw, Search } from "lucide-react";

interface AIModelSelectorProps {
  canFetchModels: boolean;
  fetchingModels: boolean;
  model: string;
  models: string[];
  onFetchModels: () => void;
  onModelChange: (value: string) => void;
}

export function AIModelSelector({
  canFetchModels,
  fetchingModels,
  model,
  models,
  onFetchModels,
  onModelChange,
}: AIModelSelectorProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredModels = models.filter((item) =>
    item.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">{t("model")}</span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-lg gap-2"
          disabled={!canFetchModels || fetchingModels}
          onClick={onFetchModels}
        >
          <RefreshCw
            className={`w-4 h-4 ${fetchingModels ? "animate-spin" : ""}`}
          />
          {fetchingModels ? t("fetching_models") : t("fetch_models")}
        </Button>
      </div>

      {models.length > 0 ? (
        <Popover
          open={open}
          onOpenChange={(nextOpen) => {
            setOpen(nextOpen);
            if (nextOpen) {
              setSearch("");
              setTimeout(() => searchInputRef.current?.focus(), 50);
            }
          }}
        >
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full h-12 rounded-xl text-base bg-background justify-between font-normal px-4"
            >
              <span className={cn("truncate", !model && "text-muted-foreground")}>
                {model || t("select_model")}
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-[--radix-popover-trigger-width]"
            style={{ width: "var(--radix-popover-trigger-width)" }}
          >
            <div className="flex items-center gap-2 px-3 py-2 border-b">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={searchInputRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("search_model")}
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <div className="max-h-60 overflow-y-auto py-1">
              {filteredModels.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    onModelChange(item);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm text-left",
                    "hover:bg-accent hover:text-accent-foreground cursor-pointer",
                    model === item && "bg-accent/50",
                  )}
                >
                  <Check
                    className={cn(
                      "h-4 w-4 shrink-0",
                      model === item ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="truncate">{item}</span>
                </button>
              ))}
              {filteredModels.length === 0 && (
                <p className="px-3 py-4 text-sm text-center text-muted-foreground">
                  {t("no_models_found")}
                </p>
              )}
            </div>
          </PopoverContent>
        </Popover>
      ) : (
        <Input
          value={model}
          onChange={(e) => onModelChange(e.target.value)}
          placeholder={t("fetch_models_placeholder")}
          className="h-12 rounded-xl text-base bg-background"
        />
      )}

      {models.length === 0 && (
        <p className="text-sm text-muted-foreground">{t("fetch_models_hint")}</p>
      )}
    </div>
  );
}
