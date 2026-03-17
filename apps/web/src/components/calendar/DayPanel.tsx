import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  X,
  CheckCircle2,
  CircleDot,
  Info,
} from "lucide-react";
import type { Currency, PaymentRecord } from "@/types";
import {
  type DayEntry,
  toDateStr,
  toMain,
  getLogoUrl,
  getColorForSub,
  getPaymentRecord,
} from "./types";

interface DayPanelProps {
  day: number;
  month: number;
  year: number;
  entries: DayEntry[];
  total: number;
  mainCurrency: Currency | undefined;
  currencies: Currency[];
  now: Date;
  t: (k: string) => string;
  paymentTracking: boolean;
  paymentRecords: PaymentRecord[];
  onSelectEntry: (entry: DayEntry) => void;
  onClose: () => void;
}

export function DayPanel({
  day,
  month,
  year,
  entries,
  total,
  mainCurrency,
  currencies,
  now,
  t,
  paymentTracking,
  paymentRecords,
  onSelectEntry,
  onClose,
}: DayPanelProps) {
  const dateLabel = new Date(year, month - 1, day).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thisDay = new Date(year, month - 1, day);
  const isToday = thisDay.getTime() === today.getTime();

  return (
    <Card className="animate-in slide-in-from-top-2 duration-200">
      <CardContent className="p-0">
        {/* Panel header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-semibold">
              {dateLabel}
              {isToday && (
                <Badge className="ml-2 bg-primary text-primary-foreground text-[10px]">
                  {t("today") || "Today"}
                </Badge>
              )}
            </p>
            {entries.length > 0 && mainCurrency ? (
              <p className="text-xs text-muted-foreground mt-0.5">
                {entries.length}{" "}
                {entries.length === 1
                  ? t("subscription") || "subscription"
                  : t("subscriptions") || "subscriptions"}{" "}
                ·{" "}
                <span className="font-medium text-foreground">
                  {formatPrice(total, mainCurrency.symbol)}
                </span>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("no_subscriptions_due") || "No subscriptions due"}
              </p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Subscription list */}
        {entries.length > 0 && (
          <div className="divide-y">
            {entries.map((entry, idx) => {
              const { sub, date } = entry;
              const logo = getLogoUrl(sub);
              const cur =
                sub.expand?.currency ??
                currencies.find((c) => c.id === sub.currency);
              const cycle = sub.expand?.cycle;
              const category = sub.expand?.category;
              const diffDays = Math.ceil(
                (thisDay.getTime() - today.getTime()) / 86400000,
              );
              const colorClass = getColorForSub(sub, idx);
              const dateStr = toDateStr(date);
              const rec = paymentTracking
                ? getPaymentRecord(paymentRecords, sub.id, dateStr)
                : undefined;
              const isPaid = !!rec?.paid_at;
              const isOverdue = paymentTracking && !isPaid && thisDay < today;

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectEntry(entry)}
                  className="group flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                >
                  {/* Logo */}
                  {logo ? (
                    <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden border bg-background p-1.5 relative">
                      <img
                        src={logo}
                        alt={sub.name}
                        className="h-full w-full object-contain"
                        onError={(e) =>
                          ((e.target as HTMLElement).style.display = "none")
                        }
                      />
                      {paymentTracking && isPaid && (
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-green-500 p-0.5">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </span>
                      )}
                      {isOverdue && (
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-red-500 p-0.5">
                          <CircleDot className="h-3 w-3 text-white" />
                        </span>
                      )}
                    </div>
                  ) : (
                    <div
                      className={cn(
                        "h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-base font-bold relative",
                        colorClass,
                      )}
                    >
                      {sub.name[0]?.toUpperCase()}
                      {paymentTracking && isPaid && (
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-green-500 p-0.5">
                          <CheckCircle2 className="h-3 w-3 text-white" />
                        </span>
                      )}
                      {isOverdue && (
                        <span className="absolute -bottom-1 -right-1 rounded-full bg-red-500 p-0.5">
                          <CircleDot className="h-3 w-3 text-white" />
                        </span>
                      )}
                    </div>
                  )}

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{sub.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {category && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] h-4 px-1.5 rounded-full"
                        >
                          {category.name}
                        </Badge>
                      )}
                      {cycle && (
                        <span className="text-[11px] text-muted-foreground">
                          {sub.frequency > 1 ? `${sub.frequency}× ` : ""}
                          {t(cycle.name.toLowerCase()) || cycle.name}
                        </span>
                      )}
                      {paymentTracking && isPaid && (
                        <Badge className="text-[10px] h-4 px-1.5 rounded-full bg-green-500/15 text-green-700 dark:text-green-400">
                          {t("paid") || "Paid"}
                        </Badge>
                      )}
                      {isOverdue && (
                        <Badge
                          variant="destructive"
                          className="text-[10px] h-4 px-1.5 rounded-full"
                        >
                          {t("overdue") || "Overdue"}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Price + badge */}
                  <div className="shrink-0 text-right">
                    <p className="font-semibold text-sm">
                      {formatPrice(sub.price, cur?.symbol ?? "$")}
                    </p>
                    {cur && mainCurrency && cur.id !== mainCurrency.id && (
                      <p className="text-[11px] text-muted-foreground">
                        ≈{" "}
                        {formatPrice(
                          toMain(sub.price, cur),
                          mainCurrency.symbol,
                        )}
                      </p>
                    )}
                    {diffDays === 0 && (
                      <Badge className="mt-1 text-[10px] bg-amber-500 text-white">
                        {t("today") || "Today"}
                      </Badge>
                    )}
                    {diffDays > 0 && diffDays <= 7 && (
                      <Badge
                        variant="outline"
                        className="mt-1 text-[10px] border-amber-400 text-amber-600"
                      >
                        {diffDays}d
                      </Badge>
                    )}
                  </div>

                  <Info className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
