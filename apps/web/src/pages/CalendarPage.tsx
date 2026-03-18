import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { subscriptionsService } from "@/services/subscriptions";
import { cyclesService } from "@/services/cycles";
import { currenciesService } from "@/services/currencies";
import { categoriesService } from "@/services/categories";
import { paymentMethodsService } from "@/services/paymentMethods";
import { householdService } from "@/services/household";
import { paymentRecordsService } from "@/services/paymentRecords";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Download,
  TrendingUp,
  Clock,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  CircleDot,
} from "lucide-react";
import type { Subscription } from "@/types";
import { SubscriptionFormModal } from "@/components/SubscriptionFormModal";
import { toast } from "@/lib/toast";

// Calendar components
import { StatCard } from "@/components/calendar/StatCard";
import { DayPanel } from "@/components/calendar/DayPanel";
import { SubDetailDialog } from "@/components/calendar/SubDetailDialog";
import { MarkAsPaidModal } from "@/components/calendar/MarkAsPaidModal";
import {
  type DayEntry,
  toDateStr,
  toDateOnly,
  toMain,
  getLogoUrl,
  getColorForSub,
  getOccurrencesInMonth,
  getPaymentRecord,
} from "@/components/calendar/types";

// ─── i18n key arrays (stable module-level constants, translated via t() at render) ─

const MONTH_KEYS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
] as const;

const DOW_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

// ─── CalendarPage ─────────────────────────────────────────────────────────────

export function CalendarPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const userId = user?.id ?? "";
  const qc = useQueryClient();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [detailEntry, setDetailEntry] = useState<DayEntry | null>(null);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [markAsPaidEntry, setMarkAsPaidEntry] = useState<DayEntry | null>(null);

  const paymentTracking = !!user?.payment_tracking;

  // ── queries ─────────────────────────────────────────────────────────────

  const { data: subs = [], isLoading: loadingSubs } = useQuery({
    queryKey: queryKeys.subscriptions.all(userId),
    queryFn: () => subscriptionsService.list(userId),
    enabled: !!userId,
  });

  const { data: cycles = [] } = useQuery({
    queryKey: queryKeys.cycles(),
    queryFn: () => cyclesService.list(),
  });

  const { data: currencies = [] } = useQuery({
    queryKey: queryKeys.currencies.all(userId),
    queryFn: () => currenciesService.list(userId),
    enabled: !!userId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories.all(userId),
    queryFn: () => categoriesService.list(userId),
    enabled: !!userId,
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: queryKeys.paymentMethods.all(userId),
    queryFn: () => paymentMethodsService.list(userId),
    enabled: !!userId,
  });

  const { data: household = [] } = useQuery({
    queryKey: queryKeys.household.all(userId),
    queryFn: () => householdService.list(userId),
    enabled: !!userId,
  });

  const { data: paymentRecords = [] } = useQuery({
    queryKey: queryKeys.paymentRecords.forMonth(userId, year, month),
    queryFn: () => {
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const daysInMo = new Date(year, month, 0).getDate();
      const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMo).padStart(2, "0")}`;

      return paymentRecordsService.listForUser(userId).then((rows) =>
        rows.filter((r) => {
          const d = toDateOnly(r.due_date);
          return d >= monthStart && d <= monthEnd;
        }),
      );
    },
    enabled: !!userId && paymentTracking,
  });

  const mainCurrency = useMemo(
    () => currencies.find((c) => c.is_main) ?? currencies[0],
    [currencies],
  );

  // O(1) currency lookup map — avoids repeated .find() in stats and selectedDayTotal loops
  const currencyById = useMemo(
    () => new Map(currencies.map((c) => [c.id, c])),
    [currencies],
  );

  // ── calendar math ───────────────────────────────────────────────────────

  const entriesByDay = useMemo<Record<number, DayEntry[]>>(() => {
    const map: Record<number, DayEntry[]> = {};
    for (const sub of subs) {
      for (const date of getOccurrencesInMonth(sub, year, month, cycles)) {
        const d = date.getDate();
        (map[d] ??= []).push({ sub, date });
      }
    }
    return map;
  }, [subs, cycles, year, month]);

  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let count = 0,
      total = 0,
      due = 0;
    for (const entries of Object.values(entriesByDay)) {
      for (const { sub, date } of entries) {
        const cur = sub.expand?.currency ?? currencyById.get(sub.currency);
        const v = toMain(sub.price, cur);
        count++;
        total += v;
        if (date >= today) due += v;
      }
    }
    return { count, total, due };
  }, [entriesByDay, currencyById]);

  const budget = user?.budget ?? 0;
  const overBudget = budget > 0 && stats.total > budget;

  // ── grid ────────────────────────────────────────────────────────────────

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [year, month]);

  const allCells = useMemo(() => {
    const firstDow = new Date(year, month - 1, 1).getDay();
    const days = new Date(year, month, 0).getDate();
    const prevMonthDays = new Date(year, month - 1, 0).getDate();

    const prevCells = Array.from(
      { length: firstDow },
      (_, i) => ({ day: prevMonthDays - firstDow + 1 + i, type: "prev" as const }),
    );
    const currentCells = Array.from(
      { length: days },
      (_, i) => ({ day: i + 1, type: "current" as const }),
    );
    const totalCells = prevCells.length + currentCells.length;
    const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    const nextCells = Array.from(
      { length: remaining },
      (_, i) => ({ day: i + 1, type: "next" as const }),
    );
    return [...prevCells, ...currentCells, ...nextCells];
  }, [year, month]);

  // ── nav ─────────────────────────────────────────────────────────────────

  const goToday = () => {
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
    setSelectedDay(null);
  };

  const prev = () => {
    setSelectedDay(null);
    if (month === 1) {
      setMonth(12);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };

  const next = () => {
    setSelectedDay(null);
    if (month === 12) {
      setMonth(1);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const isCurrentMonth =
    month === now.getMonth() + 1 && year === now.getFullYear();

  const monthLabel = `${t(MONTH_KEYS[month - 1])} ${year}`;

  // ── selected day ─────────────────────────────────────────────────────────

  const selectedEntries = useMemo(
    () => (selectedDay ? (entriesByDay[selectedDay] ?? []) : []),
    [selectedDay, entriesByDay],
  );

  const selectedDayTotal = useMemo(
    () =>
      selectedEntries.reduce((sum, { sub }) => {
        const cur = sub.expand?.currency ?? currencyById.get(sub.currency);
        return sum + toMain(sub.price, cur);
      }, 0),
    [selectedEntries, currencyById],
  );

  // ── ical ─────────────────────────────────────────────────────────────────

  const handleIcalExport = () => {
    const apiKey = user?.api_key;
    if (!apiKey) {
      toast.error(t("generate_api_key_first"));
      return;
    }
    window.open(`/api/calendar/ical?key=${apiKey}`, "_blank");
  };

  // ── render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ── Page header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t("calendar")}
          </h1>
          <p className="text-muted-foreground mt-1">
            {t("calendar_desc")}
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl shadow-sm border bg-background/50 backdrop-blur w-full sm:w-auto"
          onClick={handleIcalExport}
        >
          <Download className="h-4 w-4 mr-2" />
          {t("ical_export")}
        </Button>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<RefreshCw className="h-5 w-5" />}
          iconClass="bg-primary/20 text-primary"
          label={t("subscriptions")}
          value={String(stats.count)}
          loading={loadingSubs}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          iconClass="bg-blue-500/20 text-blue-500"
          label={t("total")}
          value={formatPrice(stats.total, mainCurrency?.symbol ?? "$")}
          loading={loadingSubs}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          iconClass="bg-amber-500/20 text-amber-500"
          label={t("due")}
          value={formatPrice(stats.due, mainCurrency?.symbol ?? "$")}
          loading={loadingSubs}
        />
      </div>

      {/* ── Over-budget warning ── */}
      {overBudget && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {t("over_budget_warning")}{" "}
            <strong>
              {formatPrice(stats.total - budget, mainCurrency?.symbol ?? "$")}
            </strong>
          </span>
        </div>
      )}

      {/* ── Full Calendar ── */}
      <Card className="overflow-hidden">
        {/* Calendar header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center rounded-lg bg-primary/10 px-2.5 py-1 min-w-[52px]">
              <span className="text-[10px] font-bold uppercase text-primary leading-tight">
                {t(MONTH_KEYS[month - 1]).slice(0, 3)}
              </span>
              <span className="text-lg font-bold text-primary leading-tight">
                {year}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold capitalize">{monthLabel}</h2>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <button
                  onClick={prev}
                  className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span>
                  {t(MONTH_KEYS[month - 1]).slice(0, 3)}{" "}
                  1 – {daysInMonth}, {year}
                </span>
                <button
                  onClick={next}
                  className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-accent transition-colors"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {stats.count > 0 && (
              <Badge variant="secondary" className="text-xs">
                {stats.count}{" "}
                {stats.count === 1
                  ? t("event")
                  : t("events")}
              </Badge>
            )}
            {!isCurrentMonth && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={goToday}
              >
                <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                {t("today")}
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {DOW_KEYS.map((d, i) => (
              <div
                key={d}
                className={cn(
                  "py-2.5 text-center text-xs font-semibold uppercase tracking-wider",
                  i === 0 || i === 6
                    ? "text-muted-foreground/50"
                    : "text-muted-foreground",
                )}
              >
                {t(d)}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {allCells.map((cell, i) => {
              const isOtherMonth = cell.type !== "current";
              const entries = isOtherMonth
                ? []
                : (entriesByDay[cell.day] ?? []);
              const colIndex = i % 7;
              const isWeekend = colIndex === 0 || colIndex === 6;
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

              const visible = entries.slice(0, 3);
              const overflow = entries.length - visible.length;

              return (
                <button
                  key={`${cell.type}-${cell.day}`}
                  type="button"
                  disabled={isOtherMonth}
                  onClick={() => {
                    if (isOtherMonth) return;
                    setSelectedDay(cell.day === selectedDay ? null : cell.day);
                  }}
                  className={cn(
                    "group relative min-h-[120px] p-2 text-left transition-all duration-150 border-b border-r focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary",
                    !isOtherMonth && "hover:bg-accent/40 cursor-pointer",
                    isOtherMonth && "bg-muted/20 cursor-default",
                    isWeekend && !isOtherMonth && "bg-muted/10",
                    isPast && "opacity-50",
                    isSelected &&
                      "bg-primary/5 ring-2 ring-inset ring-primary/40",
                  )}
                >
                  {/* Day number */}
                  <div className="flex items-start justify-between mb-1.5">
                    <span
                      className={cn(
                        "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-medium transition-colors",
                        isToday &&
                          "bg-primary text-primary-foreground font-bold shadow-sm",
                        !isToday && !isOtherMonth && "text-foreground",
                        isOtherMonth && "text-muted-foreground/40",
                      )}
                    >
                      {cell.day}
                    </span>

                    {/* Day total price */}
                    {entries.length > 0 && mainCurrency && (
                      <span className="text-[10px] font-medium text-muted-foreground mt-1 tabular-nums bg-muted/50 px-1.5 py-0.5 rounded-full">
                        {formatPrice(
                          entries.reduce((s, { sub }) => {
                            const cur =
                              sub.expand?.currency ??
                              currencies.find((c) => c.id === sub.currency);
                            return s + toMain(sub.price, cur);
                          }, 0),
                          mainCurrency.symbol,
                        )}
                      </span>
                    )}
                  </div>

                  {/* Event chips */}
                  {!loadingSubs && (
                    <div className="space-y-1">
                      {visible.map(({ sub, date }, idx) => {
                        const logo = getLogoUrl(sub);
                        const colorClass = getColorForSub(sub, idx);
                        const dateStr = toDateStr(date);
                        const rec = paymentTracking
                          ? getPaymentRecord(paymentRecords, sub.id, dateStr)
                          : undefined;
                        const isPaidChip = !!rec?.paid_at;
                        const isOverdueChip =
                          paymentTracking &&
                          !isPaidChip &&
                          date <
                            new Date(
                              now.getFullYear(),
                              now.getMonth(),
                              now.getDate(),
                            );

                        return (
                          <div
                            key={sub.id}
                            className={cn(
                              "flex items-center gap-1.5 rounded-md border px-1.5 py-[3px] transition-all",
                              colorClass,
                              "group-hover:shadow-sm",
                              isPaidChip && "opacity-60",
                            )}
                          >
                            {/* Payment status dot */}
                            {paymentTracking &&
                              (isPaidChip ? (
                                <CheckCircle2 className="h-3 w-3 shrink-0 text-green-500" />
                              ) : isOverdueChip ? (
                                <CircleDot className="h-3 w-3 shrink-0 text-red-500" />
                              ) : null)}
                            {(!paymentTracking ||
                              (!isPaidChip && !isOverdueChip)) &&
                              (logo ? (
                                <img
                                  src={logo}
                                  alt=""
                                  className="h-3.5 w-3.5 rounded-full object-contain shrink-0"
                                  onError={(e) =>
                                    ((e.target as HTMLElement).style.display =
                                      "none")
                                  }
                                />
                              ) : (
                                <span className="h-3.5 w-3.5 rounded-full bg-current/20 text-[7px] font-bold flex items-center justify-center shrink-0 opacity-60">
                                  {sub.name[0]?.toUpperCase()}
                                </span>
                              ))}
                            <span className="truncate text-[11px] font-medium leading-tight">
                              {sub.name}
                            </span>
                            {mainCurrency && (
                              <span className="ml-auto text-[10px] tabular-nums opacity-70 shrink-0">
                                {formatPrice(sub.price, mainCurrency.symbol)}
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {overflow > 0 && (
                        <p className="pl-1 text-[10px] font-medium text-muted-foreground">
                          +{overflow} {t("more")}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Day detail panel ── */}
      {selectedDay !== null && (
        <DayPanel
          day={selectedDay}
          month={month}
          year={year}
          entries={selectedEntries}
          total={selectedDayTotal}
          mainCurrency={mainCurrency}
          currencies={currencies}
          now={now}
          t={t}
          paymentTracking={paymentTracking}
          paymentRecords={paymentRecords}
          onSelectEntry={(entry) => setDetailEntry(entry)}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* ── Subscription detail dialog ── */}
      {detailEntry && (
        <SubDetailDialog
          sub={detailEntry.sub}
          date={detailEntry.date}
          currencies={currencies}
          mainCurrency={mainCurrency}
          paymentTracking={paymentTracking}
          paymentRecord={
            paymentTracking
              ? getPaymentRecord(
                  paymentRecords,
                  detailEntry.sub.id,
                  toDateStr(detailEntry.date),
                )
              : undefined
          }
          onClose={() => setDetailEntry(null)}
          onEdit={(s) => {
            setDetailEntry(null);
            setEditSub(s);
            setEditOpen(true);
          }}
          onMarkAsPaid={() => {
            setMarkAsPaidEntry(detailEntry);
            setDetailEntry(null);
          }}
          t={t}
        />
      )}

      {/* ── Mark as Paid modal ── */}
      {markAsPaidEntry && (
        <MarkAsPaidModal
          sub={markAsPaidEntry.sub}
          date={markAsPaidEntry.date}
          userId={userId}
          existingRecord={getPaymentRecord(
            paymentRecords,
            markAsPaidEntry.sub.id,
            toDateStr(markAsPaidEntry.date),
          )}
          onClose={() => setMarkAsPaidEntry(null)}
          onSaved={() => {
            setMarkAsPaidEntry(null);
            void qc.invalidateQueries({
              queryKey: queryKeys.paymentRecords.all(userId),
            });
          }}
          t={t}
        />
      )}

      {/* ── Edit modal ── */}
      {editOpen && editSub && (
        <SubscriptionFormModal
          sub={editSub}
          userId={userId}
          currencies={currencies}
          categories={categories}
          paymentMethods={paymentMethods}
          household={household}
          onClose={() => {
            setEditOpen(false);
            setEditSub(null);
          }}
          onSaved={() => {
            setEditOpen(false);
            setEditSub(null);
            void qc.invalidateQueries({ queryKey: queryKeys.subscriptions.all(userId) });
          }}
        />
      )}
    </div>
  );
}
