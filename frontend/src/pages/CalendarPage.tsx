import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import pb from "@/lib/pb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { formatPrice, formatDate, daysUntil } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Download,
  TrendingUp,
  Clock,
  ExternalLink,
  Pencil,
  Tag,
  Users,
  RefreshCw,
  AlertTriangle,
  CreditCard,
  Banknote,
  Info,
  X,
} from "lucide-react";
import type {
  Subscription,
  Currency,
  Category,
  PaymentMethod,
  Household,
  Cycle,
} from "@/types";
import { SubscriptionFormModal } from "@/components/SubscriptionFormModal";

// ─── helpers ─────────────────────────────────────────────────────────────────

function getOccurrencesInMonth(
  sub: Subscription,
  year: number,
  month: number,
  cycles: Cycle[],
): Date[] {
  if (sub.inactive) return [];

  // Prefer expanded cycle; fall back to cycles list lookup
  const cycle =
    sub.expand?.cycle ?? cycles.find((c) => c.id === sub.cycle);
  const cycleName = cycle?.name ?? "Monthly"; // safe default

  const freq = Math.max(1, sub.frequency || 1);

  const add = (d: Date): Date => {
    const r = new Date(d);
    if (cycleName === "Daily") r.setDate(r.getDate() + freq);
    else if (cycleName === "Weekly") r.setDate(r.getDate() + freq * 7);
    else if (cycleName === "Monthly") r.setMonth(r.getMonth() + freq);
    else if (cycleName === "Yearly") r.setFullYear(r.getFullYear() + freq);
    return r;
  };

  const sub1 = (d: Date): Date => {
    const r = new Date(d);
    if (cycleName === "Daily") r.setDate(r.getDate() - freq);
    else if (cycleName === "Weekly") r.setDate(r.getDate() - freq * 7);
    else if (cycleName === "Monthly") r.setMonth(r.getMonth() - freq);
    else if (cycleName === "Yearly") r.setFullYear(r.getFullYear() - freq);
    return r;
  };

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  // Parse as local date — PocketBase uses "YYYY-MM-DD HH:mm:ss.SSSZ" format
  let cursor: Date;
  if (!sub.next_payment) return [];
  
  // PocketBase returns "YYYY-MM-DD HH:mm:ss.SSSZ" (space) or "YYYY-MM-DDTHH:..."
  const datePart = sub.next_payment.split(/[T ]/)[0];
  const parts = datePart.split("-");
  if (parts.length >= 3) {
    const [py, pm, pd] = parts.map(Number);
    cursor = new Date(py, pm - 1, pd);
  } else {
    cursor = new Date(sub.next_payment);
  }
  
  if (isNaN(cursor.getTime())) return [];

  // Walk back until we're before or at monthStart
  let g = 0;
  while (cursor > monthStart && g++ < 600) {
    const prev = sub1(cursor);
    if (prev.getTime() >= cursor.getTime()) break; // guard infinite loop
    cursor = prev;
  }

  // Collect all dates in this month
  const results: Date[] = [];
  g = 0;
  while (cursor <= monthEnd && g++ < 600) {
    if (cursor >= monthStart) results.push(new Date(cursor));
    const next = add(cursor);
    if (next.getTime() <= cursor.getTime()) break;
    cursor = next;
  }

  return results;
}

/** price_in_main = price / currency.rate  (Wallos formula) */
function toMain(price: number, cur: Currency | undefined): number {
  if (!cur || !cur.rate || cur.is_main) return price;
  return price / cur.rate;
}

function getLogoUrl(sub: Subscription): string | null {
  if (!sub.logo) return null;
  return pb.files.getUrl(
    { collectionId: "subscriptions", id: sub.id } as Parameters<
      typeof pb.files.getUrl
    >[0],
    sub.logo,
  );
}

// ─── sub-types ───────────────────────────────────────────────────────────────

interface DayEntry {
  sub: Subscription;
  date: Date;
}

// Category colors for visual coding
const EVENT_COLORS = [
  "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30",
  "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
  "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30",
  "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30",
  "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30",
  "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
  "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-500/30",
  "bg-pink-500/15 text-pink-700 dark:text-pink-400 border-pink-500/30",
  "bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30",
  "bg-teal-500/15 text-teal-700 dark:text-teal-400 border-teal-500/30",
];

function getColorForSub(sub: Subscription, index: number): string {
  // Use subscription id hash for stable coloring
  const hash = sub.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return EVENT_COLORS[(hash + index) % EVENT_COLORS.length];
}

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
  const [detailSub, setDetailSub] = useState<Subscription | null>(null);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // ── queries ─────────────────────────────────────────────────────────────

  const { data: subs = [], isLoading: loadingSubs } = useQuery({
    queryKey: ["subscriptions", userId],
    queryFn: () =>
      pb.collection("subscriptions").getFullList<Subscription>({
        filter: `user = "${userId}"`,
        expand: "currency,cycle,category,payment_method,payer",
      }),
    enabled: !!userId,
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ["cycles"],
    queryFn: () => pb.collection("cycles").getFullList<Cycle>(),
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies", userId],
    queryFn: () =>
      pb.collection("currencies").getFullList<Currency>({
        filter: `user = "${userId}"`,
      }),
    enabled: !!userId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", userId],
    queryFn: () =>
      pb.collection("categories").getFullList<Category>({
        filter: `user = "${userId}"`,
      }),
    enabled: !!userId,
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment_methods", userId],
    queryFn: () =>
      pb.collection("payment_methods").getFullList<PaymentMethod>({
        filter: `user = "${userId}"`,
      }),
    enabled: !!userId,
  });

  const { data: household = [] } = useQuery({
    queryKey: ["household", userId],
    queryFn: () =>
      pb.collection("household").getFullList<Household>({
        filter: `user = "${userId}"`,
      }),
    enabled: !!userId,
  });

  const mainCurrency = currencies.find((c) => c.is_main) ?? currencies[0];

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
    let count = 0, total = 0, due = 0;
    for (const entries of Object.values(entriesByDay)) {
      for (const { sub, date } of entries) {
        const cur =
          sub.expand?.currency ??
          currencies.find((c) => c.id === sub.currency);
        const v = toMain(sub.price, cur);
        count++;
        total += v;
        if (date >= today) due += v;
      }
    }
    return { count, total, due };
  }, [entriesByDay, currencies]);

  const budget = user?.budget ?? 0;
  const overBudget = budget > 0 && stats.total > budget;

  // ── grid ────────────────────────────────────────────────────────────────

  const firstDow = new Date(year, month - 1, 1).getDay();
  // Sun-first grid to match full-calendar reference
  const offsetSun = firstDow;
  const daysInMonth = new Date(year, month, 0).getDate();

  // Previous month days
  const prevMonthDays = new Date(year, month - 1, 0).getDate();
  const prevCells: { day: number; type: "prev" }[] = Array.from(
    { length: offsetSun },
    (_, i) => ({ day: prevMonthDays - offsetSun + 1 + i, type: "prev" }),
  );

  // Current month days
  const currentCells: { day: number; type: "current" }[] = Array.from(
    { length: daysInMonth },
    (_, i) => ({ day: i + 1, type: "current" }),
  );

  // Next month days
  const totalCells = prevCells.length + currentCells.length;
  const remaining = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
  const nextCells: { day: number; type: "next" }[] = Array.from(
    { length: remaining },
    (_, i) => ({ day: i + 1, type: "next" }),
  );

  const allCells = [
    ...prevCells,
    ...currentCells,
    ...nextCells,
  ] as { day: number; type: "prev" | "current" | "next" }[];

  // ── nav ─────────────────────────────────────────────────────────────────

  const goToday = () => {
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
    setSelectedDay(null);
  };

  const prev = () => {
    setSelectedDay(null);
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };

  const next = () => {
    setSelectedDay(null);
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const isCurrentMonth =
    month === now.getMonth() + 1 && year === now.getFullYear();

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  const monthLabel = `${t(monthNames[month - 1].toLowerCase()) || monthNames[month - 1]} ${year}`;

  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // ── selected day ─────────────────────────────────────────────────────────

  const selectedEntries = selectedDay ? (entriesByDay[selectedDay] ?? []) : [];

  const selectedDayTotal = useMemo(
    () =>
      selectedEntries.reduce((sum, { sub }) => {
        const cur =
          sub.expand?.currency ??
          currencies.find((c) => c.id === sub.currency);
        return sum + toMain(sub.price, cur);
      }, 0),
    [selectedEntries, currencies],
  );

  // ── ical ─────────────────────────────────────────────────────────────────

  const handleIcalExport = () => {
    const apiKey = user?.api_key;
    if (!apiKey) {
      alert("Generate an API key in Settings first.");
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
            {t("calendar") || "Calendar"}
          </h1>
          <p className="text-muted-foreground mt-1">View your upcoming payments and manage dates.</p>
        </div>
        <Button variant="outline" className="rounded-xl shadow-sm border bg-background/50 backdrop-blur w-full sm:w-auto" onClick={handleIcalExport}>
          <Download className="h-4 w-4 mr-2" />
          {t("ical_export") || "Export iCal"}
        </Button>
      </div>

      {/* ── Stats bar ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<RefreshCw className="h-5 w-5" />}
          iconClass="bg-primary/20 text-primary"
          label={t("subscriptions") || "Subscriptions"}
          value={String(stats.count)}
          loading={loadingSubs}
        />
        <StatCard
          icon={<TrendingUp className="h-5 w-5" />}
          iconClass="bg-blue-500/20 text-blue-500"
          label={"Total"}
          value={formatPrice(stats.total, mainCurrency?.symbol ?? "$")}
          loading={loadingSubs}
        />
        <StatCard
          icon={<Clock className="h-5 w-5" />}
          iconClass="bg-amber-500/20 text-amber-500"
          label={"Due"}
          value={formatPrice(stats.due, mainCurrency?.symbol ?? "$")}
          loading={loadingSubs}
        />
      </div>

      {/* ── Over-budget warning ── */}
      {overBudget && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/8 px-4 py-3 text-sm text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {t("over_budget_warning") || "Budget exceeded by"}{" "}
            <strong>
              {formatPrice(stats.total - budget, mainCurrency?.symbol ?? "$")}
            </strong>
          </span>
        </div>
      )}

      {/* ── Full Calendar ── */}
      <Card className="overflow-hidden">
        {/* Calendar header — inspired by full-calendar */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          {/* Left: Month badge + date range */}
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center rounded-lg bg-primary/10 px-2.5 py-1 min-w-[52px]">
              <span className="text-[10px] font-bold uppercase text-primary leading-tight">
                {(t(monthNames[month - 1].toLowerCase()) || monthNames[month - 1]).slice(0, 3)}
              </span>
              <span className="text-lg font-bold text-primary leading-tight">
                {year}
              </span>
            </div>
            <div>
              <h2 className="text-lg font-semibold capitalize">
                {monthLabel}
              </h2>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <button
                  onClick={prev}
                  className="inline-flex items-center justify-center h-5 w-5 rounded hover:bg-accent transition-colors"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span>
                  {(t(monthNames[month - 1].toLowerCase()) || monthNames[month - 1]).slice(0, 3)} 1 – {daysInMonth}, {year}
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

          {/* Right: Event count + Today button */}
          <div className="flex items-center gap-3">
            {stats.count > 0 && (
              <Badge variant="secondary" className="text-xs">
                {stats.count} {stats.count === 1 ? (t("event") || "event") : (t("events") || "events")}
              </Badge>
            )}
            {!isCurrentMonth && (
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
                <CalendarDays className="h-3.5 w-3.5 mr-1.5" />
                {t("today") || "Today"}
              </Button>
            )}
          </div>
        </div>

        <CardContent className="p-0">
          {/* Day-of-week header */}
          <div className="grid grid-cols-7 border-b bg-muted/30">
            {DOW.map((d, i) => (
              <div
                key={d}
                className={cn(
                  "py-2.5 text-center text-xs font-semibold uppercase tracking-wider",
                  i === 0 || i === 6
                    ? "text-muted-foreground/50"
                    : "text-muted-foreground",
                )}
              >
                {t(d.toLowerCase()) || d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {allCells.map((cell, i) => {
              const isOtherMonth = cell.type !== "current";
              const entries = isOtherMonth ? [] : (entriesByDay[cell.day] ?? []);
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
                    isSelected && "bg-primary/5 ring-2 ring-inset ring-primary/40",
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

                  {/* Event chips — styled like full-calendar */}
                  {!loadingSubs && (
                    <div className="space-y-1">
                      {visible.map(({ sub }, idx) => {
                        const logo = getLogoUrl(sub);
                        const colorClass = getColorForSub(sub, idx);
                        return (
                          <div
                            key={sub.id}
                            className={cn(
                              "flex items-center gap-1.5 rounded-md border px-1.5 py-[3px] transition-all",
                              colorClass,
                              "group-hover:shadow-sm",
                            )}
                          >
                            {logo ? (
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
                            )}
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
                          +{overflow} {t("more") || "more"}
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

      {/* ── Day detail panel (slide-down) ── */}
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
          onSelectSub={setDetailSub}
          onClose={() => setSelectedDay(null)}
        />
      )}

      {/* ── Subscription detail dialog ── */}
      {detailSub && (
        <SubDetailDialog
          sub={detailSub}
          currencies={currencies}
          mainCurrency={mainCurrency}
          onClose={() => setDetailSub(null)}
          onEdit={(s) => {
            setDetailSub(null);
            setEditSub(s);
            setEditOpen(true);
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
          onClose={() => { setEditOpen(false); setEditSub(null); }}
          onSaved={() => {
            setEditOpen(false);
            setEditSub(null);
            void qc.invalidateQueries({ queryKey: ["subscriptions", userId] });
          }}
        />
      )}
    </div>
  );
}

// ─── StatCard ────────────────────────────────────────────────────────────────

function StatCard({
  icon,
  iconClass,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  iconClass: string;
  label: string;
  value: string;
  loading: boolean;
}) {
  return (
    <Card className="shadow-sm border bg-card/40 backdrop-blur-md rounded-3xl overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("rounded-2xl p-3 shrink-0 shadow-sm", iconClass)}>{icon}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
          {loading ? (
            <div className="mt-1 h-6 w-24 animate-pulse rounded-md bg-muted" />
          ) : (
            <p className="text-2xl font-extrabold tracking-tight truncate text-foreground">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── DayPanel ────────────────────────────────────────────────────────────────

function DayPanel({
  day,
  month,
  year,
  entries,
  total,
  mainCurrency,
  currencies,
  now,
  t,
  onSelectSub,
  onClose,
}: {
  day: number;
  month: number;
  year: number;
  entries: DayEntry[];
  total: number;
  mainCurrency: Currency | undefined;
  currencies: Currency[];
  now: Date;
  t: (k: string) => string;
  onSelectSub: (sub: Subscription) => void;
  onClose: () => void;
}) {
  const dateLabel = new Date(year, month - 1, day).toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric", year: "numeric" },
  );
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
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Subscription list */}
        {entries.length > 0 && (
          <div className="divide-y">
            {entries.map(({ sub }, idx) => {
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

              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => onSelectSub(sub)}
                  className="group flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/40"
                >
                  {/* Logo */}
                  {logo ? (
                    <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden border bg-background p-1.5">
                      <img
                        src={logo}
                        alt={sub.name}
                        className="h-full w-full object-contain"
                        onError={(e) =>
                          ((e.target as HTMLElement).style.display = "none")
                        }
                      />
                    </div>
                  ) : (
                    <div className={cn(
                      "h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-base font-bold",
                      colorClass,
                    )}>
                      {sub.name[0]?.toUpperCase()}
                    </div>
                  )}

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{sub.name}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {category && (
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 rounded-full">
                          {category.name}
                        </Badge>
                      )}
                      {cycle && (
                        <span className="text-[11px] text-muted-foreground">
                          {sub.frequency > 1 ? `${sub.frequency}× ` : ""}
                          {t(cycle.name.toLowerCase()) || cycle.name}
                        </span>
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
                        ≈ {formatPrice(toMain(sub.price, cur), mainCurrency.symbol)}
                      </p>
                    )}
                    {diffDays === 0 && (
                      <Badge className="mt-1 text-[10px] bg-amber-500 text-white">
                        {t("today") || "Today"}
                      </Badge>
                    )}
                    {diffDays > 0 && diffDays <= 7 && (
                      <Badge variant="outline" className="mt-1 text-[10px] border-amber-400 text-amber-600">
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

// ─── SubDetailDialog ─────────────────────────────────────────────────────────

function SubDetailDialog({
  sub,
  currencies,
  mainCurrency,
  onClose,
  onEdit,
  t,
}: {
  sub: Subscription;
  currencies: Currency[];
  mainCurrency: Currency | undefined;
  onClose: () => void;
  onEdit: (s: Subscription) => void;
  t: (k: string) => string;
}) {
  const cur =
    sub.expand?.currency ?? currencies.find((c) => c.id === sub.currency);
  const cycle = sub.expand?.cycle;
  const category = sub.expand?.category;
  const paymentMethod = sub.expand?.payment_method;
  const payer = sub.expand?.payer;
  const logo = getLogoUrl(sub);

  const cycleLabel = cycle
    ? `${sub.frequency > 1 ? `Every ${sub.frequency} ` : ""}${cycle.name
        .replace("ly", "")
        .toLowerCase()}${sub.frequency > 1 ? "s" : ""}`
    : "";

  const dLeft = daysUntil(sub.next_payment);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            {logo ? (
              <div className="h-11 w-11 shrink-0 rounded-xl overflow-hidden border bg-background p-1.5">
                <img
                  src={logo}
                  alt=""
                  className="h-full w-full object-contain"
                  onError={(e) =>
                    ((e.target as HTMLElement).style.display = "none")
                  }
                />
              </div>
            ) : (
              <div className="h-11 w-11 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                {sub.name[0]?.toUpperCase()}
              </div>
            )}
            <div>
              <p className="leading-tight">{sub.name}</p>
              {sub.inactive ? (
                <Badge variant="secondary" className="text-[10px] mt-0.5">
                  {t("inactive") || "Inactive"}
                </Badge>
              ) : (
                <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 text-[10px] mt-0.5">
                  {t("active") || "Active"}
                </Badge>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Price hero */}
          <div className="flex items-end justify-between rounded-xl bg-muted/50 px-4 py-3">
            <div>
              <p className="text-2xl font-bold">
                {formatPrice(sub.price, cur?.symbol ?? "$")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{cycleLabel}</p>
            </div>
            {cur && mainCurrency && cur.id !== mainCurrency.id && (
              <div className="text-right">
                <p className="text-base font-semibold">
                  ≈ {formatPrice(toMain(sub.price, cur), mainCurrency.symbol)}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t("converted") || "converted"}
                </p>
              </div>
            )}
          </div>

          {/* Info rows */}
          <div className="space-y-2.5">
            <InfoRow
              icon={<CalendarDays className="h-4 w-4" />}
              label={t("next_payment") || "Next payment"}
            >
              <span className="flex items-center gap-1.5 flex-wrap">
                <span>{formatDate(sub.next_payment)}</span>
                {dLeft === 0 && (
                  <Badge className="text-[10px] bg-amber-500 text-white">
                    {t("today") || "Today"}
                  </Badge>
                )}
                {dLeft > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {dLeft}d
                  </Badge>
                )}
                {dLeft < 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {t("overdue") || "Overdue"}
                  </Badge>
                )}
              </span>
            </InfoRow>

            {category && (
              <InfoRow icon={<Tag className="h-4 w-4" />} label={t("category") || "Category"}>
                {category.name}
              </InfoRow>
            )}

            {paymentMethod && (
              <InfoRow
                icon={<CreditCard className="h-4 w-4" />}
                label={t("payment_method") || "Payment"}
              >
                {paymentMethod.name}
              </InfoRow>
            )}

            {payer && (
              <InfoRow icon={<Users className="h-4 w-4" />} label={t("payer") || "Payer"}>
                {payer.name}
              </InfoRow>
            )}

            {sub.start_date && (
              <InfoRow icon={<Clock className="h-4 w-4" />} label={t("start_date") || "Started"}>
                {formatDate(sub.start_date)}
              </InfoRow>
            )}

            {sub.url && (
              <InfoRow
                icon={<ExternalLink className="h-4 w-4" />}
                label={t("url") || "URL"}
              >
                <a
                  href={sub.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline-offset-2 hover:underline"
                >
                  {sub.url.replace(/^https?:\/\//, "").split("/")[0]}
                </a>
              </InfoRow>
            )}

            <InfoRow
              icon={<Banknote className="h-4 w-4" />}
              label={t("auto_renew") || "Auto renew"}
            >
              {sub.auto_renew ? t("yes") || "Yes" : t("no") || "No"}
            </InfoRow>
          </div>

          {sub.notes && (
            <>
              <Separator />
              <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {sub.notes}
              </p>
            </>
          )}

          <Separator />

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={onClose}>
              {t("close") || "Close"}
            </Button>
            <Button size="sm" onClick={() => onEdit(sub)}>
              <Pencil className="h-3.5 w-3.5 mr-1.5" />
              {t("edit") || "Edit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── InfoRow ─────────────────────────────────────────────────────────────────

function InfoRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span className="mt-px text-muted-foreground shrink-0">{icon}</span>
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium leading-snug">{children}</span>
    </div>
  );
}
