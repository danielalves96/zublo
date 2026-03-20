import { Edit2, Star, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Currency } from "@/types";

interface CurrencyListItemProps {
  currency: Currency;
  onDelete: () => void;
  onEdit: () => void;
  onSetMain: () => void;
}

export function CurrencyListItem({
  currency,
  onDelete,
  onEdit,
  onSetMain,
}: CurrencyListItemProps) {
  return (
    <div
      className={`flex items-center justify-between p-4 rounded-2xl border transition-colors group ${
        currency.is_main
          ? "bg-primary/5 border-primary/20 shadow-sm"
          : "bg-card hover:bg-muted/30"
      }`}
    >
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => !currency.is_main && onSetMain()}
          className={`p-2 rounded-full transition-colors ${
            currency.is_main
              ? "text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20"
              : "text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100"
          }`}
          title={currency.is_main ? "Main Currency" : "Set as Main"}
        >
          <Star
            className={`w-5 h-5 ${currency.is_main ? "fill-current" : ""}`}
          />
        </button>
        <div>
          <span className="font-semibold text-lg">{currency.code}</span>
          <span className="text-muted-foreground ml-2 px-2 py-0.5 rounded-md bg-muted text-sm">
            {currency.symbol}
          </span>
          {currency.name && (
            <span className="text-muted-foreground ml-3 text-sm">
              {currency.name}
            </span>
          )}
        </div>
      </div>
      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
        {!currency.is_main && (
          <Button
            size="icon"
            variant="ghost"
            className="text-muted-foreground hover:text-foreground"
            onClick={onEdit}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        )}
        {!currency.is_main && (
          <Button
            size="icon"
            variant="ghost"
            className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
            onClick={onDelete}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
