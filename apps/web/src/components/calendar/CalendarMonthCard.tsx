import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import { DOW_KEYS, MONTH_KEYS } from "@/components/calendar/constants";
import {
  type DayEntry,
  getColorForSub,
  getLogoUrl,
  getPaymentRecord,
  toDateStr,
  toMain,
} from "@/components/calendar/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatPrice } from "@/lib/utils";
import type { Currency, PaymentRecord } from "@/types";

type CalendarCell = {
  day: number;
  type: "prev" | "current" | "next";
};

interface CalendarMonthCardProps {
  month: number;
  year: number;
  now: Date;
  daysInMonth: number;
  isCurrentMonth: boolean;
  loading: boolean;
  statsCount: number;
  selectedDay: number | null;
  allCells: CalendarCell[];
  entriesByDay: Record<number, DayEntry[]>;
  mainCurrency?: Currency;
  currencyById: Map<string, Currency>;
  paymentTracking: boolean;
  paymentRecords: PaymentRecord[];
  onPrev: () => void;
  onNext: () => void;
  onGoToday: () => void;
  onSelectDay: (day: number | null) => void;
}

export function CalendarMonthCard({
  month,
  year,
  now,
  daysInMonth,
  isCurrentMonth,
  loading,
  statsCount,
  selectedDay,
  allCells,
  entriesByDay,
  mainCurrency,
  currencyById,
  paymentTracking,
  paymentRecords,
  onPrev,
  onNext,
  onGoToday,
  onSelectDay,
}: CalendarMonthCardProps) {
  const { t } = useTranslation();
  const monthLabel = `${t(MONTH_KEYS[month - 1])} ${year}`;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex min-w-[52px] flex-col items-center rounded-lg bg-primary/10 px-2.5 py-1">
            <span className="text-[10px] font-bold uppercase leading-tight text-primary">
              {t(MONTH_KEYS[month - 1]).slice(0, 3)}
            </span>
            <span className="text-lg font-bold leading-tight text-primary">
              {year}
            </span>
          </div>
          <div>
            <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <button
                onClick={onPrev}
                className="inline-flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-accent"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span>
                {t(MONTH_KEYS[month - 1]).slice(0, 3)} 1 - {daysInMonth}, {year}
              </span>
              <button
                onClick={onNext}
                className="inline-flex h-5 w-5 items-center justify-center rounded transition-colors hover:bg-accent"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {statsCount > 0 ? (
            <Badge variant="secondary" className="text-xs">
              {statsCount} {statsCount === 1 ? t("event") : t("events")}
            </Badge>
          ) : null}
          {!isCurrentMonth ? (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={onGoToday}
            >
              <CalendarDays className="mr-1.5 h-3.5 w-3.5" />
              {t("today")}
            </Button>
          ) : null}
        </div>
      </div>

      <CardContent className="p-0">
        <div className="grid grid-cols-7 border-b bg-muted/30">
          {DOW_KEYS.map((dayOfWeek, index) => (
            <div
              key={dayOfWeek}
              className={cn(
                "py-2.5 text-center text-xs font-semibold uppercase tracking-wider",
                index === 0 || index === 6
                  ? "text-muted-foreground/50"
                  : "text-muted-foreground",
              )}
            >
              {t(dayOfWeek)}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {allCells.map((cell, index) => {
            const isOtherMonth = cell.type !== "current";
            const entries = isOtherMonth ? [] : entriesByDay[cell.day] ?? [];
            const columnIndex = index % 7;
            const isWeekend = columnIndex === 0 || columnIndex === 6;
            const isToday =
              !isOtherMonth &&
              cell.day === now.getDate() &&
              month === now.getMonth() + 1 &&
              year === now.getFullYear();
            const isPast =
              !isOtherMonth &&
              !isToday &&
              new Date(year, month - 1, cell.day) <
                new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const isSelected = !isOtherMonth && cell.day === selectedDay;
            const visibleEntries = entries.slice(0, 3);
            const overflow = entries.length - visibleEntries.length;

            return (
              <button
                key={`${cell.type}-${cell.day}`}
                type="button"
                disabled={isOtherMonth}
                onClick={() => {
                  if (isOtherMonth) {
                    return;
                  }

                  onSelectDay(cell.day === selectedDay ? null : cell.day);
                }}
                className={cn(
                  "group relative min-h-[120px] border-b border-r p-2 text-left transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                  !isOtherMonth && "cursor-pointer hover:bg-accent/40",
                  isOtherMonth && "cursor-default bg-muted/20",
                  isWeekend && !isOtherMonth && "bg-muted/10",
                  isPast && "opacity-50",
                  isSelected && "bg-primary/5 ring-2 ring-inset ring-primary/40",
                )}
              >
                <div className="mb-1.5 flex items-start justify-between">
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors",
                      isToday &&
                        "bg-primary font-bold text-primary-foreground shadow-sm",
                      !isToday && !isOtherMonth && "text-foreground",
                      isOtherMonth && "text-muted-foreground/40",
                    )}
                  >
                    {cell.day}
                  </span>

                  {entries.length > 0 && mainCurrency ? (
                    <span className="mt-1 rounded-full bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                      {formatPrice(
                        entries.reduce((sum, { sub }) => {
                          const currency =
                            sub.expand?.currency ?? currencyById.get(sub.currency);
                          return sum + toMain(sub.price, currency);
                        }, 0),
                        mainCurrency.symbol,
                      )}
                    </span>
                  ) : null}
                </div>

                {!loading ? (
                  <div className="space-y-1">
                    {visibleEntries.map(({ sub, date }, entryIndex) => {
                      const logo = getLogoUrl(sub);
                      const colorClass = getColorForSub(sub, entryIndex);
                      const dateStr = toDateStr(date);
                      const paymentRecord = paymentTracking
                        ? getPaymentRecord(paymentRecords, sub.id, dateStr)
                        : undefined;
                      const isPaid = !!paymentRecord?.paid_at;
                      const isOverdue =
                        paymentTracking &&
                        !isPaid &&
                        date <
                          new Date(
                            now.getFullYear(),
                            now.getMonth(),
                            now.getDate(),
                          );

                      return (
                        <div
                          key={`${sub.id}-${dateStr}`}
                          className={cn(
                            "flex items-center gap-1.5 rounded-md border px-1.5 py-[3px] transition-all group-hover:shadow-sm",
                            colorClass,
                            isPaid && "opacity-60",
                          )}
                        >
                          {paymentTracking ? (
                            isPaid ? (
                              <CheckCircle2 className="h-3 w-3 shrink-0 text-green-500" />
                            ) : isOverdue ? (
                              <CircleDot className="h-3 w-3 shrink-0 text-red-500" />
                            ) : null
                          ) : null}

                          {(!paymentTracking || (!isPaid && !isOverdue)) &&
                            (logo ? (
                              <img
                                src={logo}
                                alt=""
                                className="h-3.5 w-3.5 shrink-0 rounded-full object-contain"
                                onError={(event) => {
                                  (event.target as HTMLElement).style.display = "none";
                                }}
                              />
                            ) : (
                              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-current/20 text-[7px] font-bold opacity-60">
                                {sub.name[0]?.toUpperCase()}
                              </span>
                            ))}

                          <span className="truncate text-[11px] font-medium leading-tight">
                            {sub.name}
                          </span>

                          {mainCurrency ? (
                            <span className="ml-auto shrink-0 text-[10px] tabular-nums opacity-70">
                              {formatPrice(sub.price, mainCurrency.symbol)}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}

                    {overflow > 0 ? (
                      <p className="pl-1 text-[10px] font-medium text-muted-foreground">
                        +{overflow} {t("more")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
