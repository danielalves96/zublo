import { useState, useMemo, useRef } from "react";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import pb from "@/lib/pb";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  CheckCircle2,
  CircleDot,
  Upload,
  FileText,
  Eye,
} from "lucide-react";
import type {
  Subscription,
  Currency,
  Category,
  PaymentMethod,
  Household,
  Cycle,
  PaymentRecord,
} from "@/types";
import { SubscriptionFormModal } from "@/components/SubscriptionFormModal";
import { toast } from "@/lib/toast";

// ─── helpers ─────────────────────────────────────────────────────────────────

function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toDateOnly(value: string | undefined | null): string {
  if (!value) return "";
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  if (match?.[0]) return match[0];
  return value.slice(0, 10);
}

function getPaymentRecord(
  records: PaymentRecord[],
  subId: string,
  dateStr: string,
): PaymentRecord | undefined {
  const matches = records.filter(
    (r) => r.subscription_id === subId && toDateOnly(r.due_date) === dateStr,
  );

  if (matches.length === 0) return undefined;

  const paid = matches
    .filter((r) => !!r.paid_at)
    .sort(
      (a, b) =>
        new Date(b.paid_at ?? 0).getTime() - new Date(a.paid_at ?? 0).getTime(),
    );

  return paid[0] ?? matches[0];
}

function getOccurrencesInMonth(
  sub: Subscription,
  year: number,
  month: number,
  cycles: Cycle[],
): Date[] {
  if (sub.inactive) return [];

  // Prefer expanded cycle; fall back to cycles list lookup
  const cycle = sub.expand?.cycle ?? cycles.find((c) => c.id === sub.cycle);
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
  const [detailEntry, setDetailEntry] = useState<DayEntry | null>(null);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [markAsPaidEntry, setMarkAsPaidEntry] = useState<DayEntry | null>(null);

  const paymentTracking = !!user?.payment_tracking;

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

  const { data: paymentRecords = [] } = useQuery({
    queryKey: ["payment_records", userId, year, month],
    queryFn: () => {
      const monthStart = `${year}-${String(month).padStart(2, "0")}-01`;
      const daysInMo = new Date(year, month, 0).getDate();
      const monthEnd = `${year}-${String(month).padStart(2, "0")}-${String(daysInMo).padStart(2, "0")}`;

      return pb
        .collection("payment_records")
        .getFullList<PaymentRecord>({
          filter: `user = "${userId}"`,
        })
        .then((rows) =>
          rows.filter((r) => {
            const d = toDateOnly(r.due_date);
            return d >= monthStart && d <= monthEnd;
          }),
        );
    },
    enabled: !!userId && paymentTracking,
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
    let count = 0,
      total = 0,
      due = 0;
    for (const entries of Object.values(entriesByDay)) {
      for (const { sub, date } of entries) {
        const cur =
          sub.expand?.currency ?? currencies.find((c) => c.id === sub.currency);
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

  const allCells = [...prevCells, ...currentCells, ...nextCells] as {
    day: number;
    type: "prev" | "current" | "next";
  }[];

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

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const monthLabel = `${t(monthNames[month - 1].toLowerCase()) || monthNames[month - 1]} ${year}`;

  const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // ── selected day ─────────────────────────────────────────────────────────

  const selectedEntries = selectedDay ? (entriesByDay[selectedDay] ?? []) : [];

  const selectedDayTotal = useMemo(
    () =>
      selectedEntries.reduce((sum, { sub }) => {
        const cur =
          sub.expand?.currency ?? currencies.find((c) => c.id === sub.currency);
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
          <p className="text-muted-foreground mt-1">
            View your upcoming payments and manage dates.
          </p>
        </div>
        <Button
          variant="outline"
          className="rounded-xl shadow-sm border bg-background/50 backdrop-blur w-full sm:w-auto"
          onClick={handleIcalExport}
        >
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
                {(
                  t(monthNames[month - 1].toLowerCase()) ||
                  monthNames[month - 1]
                ).slice(0, 3)}
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
                  {(
                    t(monthNames[month - 1].toLowerCase()) ||
                    monthNames[month - 1]
                  ).slice(0, 3)}{" "}
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

          {/* Right: Event count + Today button */}
          <div className="flex items-center gap-3">
            {stats.count > 0 && (
              <Badge variant="secondary" className="text-xs">
                {stats.count}{" "}
                {stats.count === 1
                  ? t("event") || "event"
                  : t("events") || "events"}
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

                  {/* Event chips — styled like full-calendar */}
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
              queryKey: ["payment_records", userId],
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
        <div className={cn("rounded-2xl p-3 shrink-0 shadow-sm", iconClass)}>
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted-foreground truncate">
            {label}
          </p>
          {loading ? (
            <div className="mt-1 h-6 w-24 animate-pulse rounded-md bg-muted" />
          ) : (
            <p className="text-2xl font-extrabold tracking-tight truncate text-foreground">
              {value}
            </p>
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
  paymentTracking,
  paymentRecords,
  onSelectEntry,
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
  paymentTracking: boolean;
  paymentRecords: PaymentRecord[];
  onSelectEntry: (entry: DayEntry) => void;
  onClose: () => void;
}) {
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

// ─── SubDetailDialog ─────────────────────────────────────────────────────────

function SubDetailDialog({
  sub,
  date,
  currencies,
  mainCurrency,
  paymentTracking,
  paymentRecord,
  onClose,
  onEdit,
  onMarkAsPaid,
  t,
}: {
  sub: Subscription;
  date: Date;
  currencies: Currency[];
  mainCurrency: Currency | undefined;
  paymentTracking: boolean;
  paymentRecord: PaymentRecord | undefined;
  onClose: () => void;
  onEdit: (s: Subscription) => void;
  onMarkAsPaid: () => void;
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
  const isPaid = !!paymentRecord?.paid_at;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = paymentTracking && !isPaid && date < today;

  // Proof URL
  const proofUrl = paymentRecord?.proof
    ? pb.files.getUrl(
        { collectionId: "payment_records", id: paymentRecord.id } as Parameters<
          typeof pb.files.getUrl
        >[0],
        paymentRecord.proof,
      )
    : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="border-b bg-card/70 backdrop-blur px-6 py-5">
          <DialogTitle className="flex items-center gap-4">
            {logo ? (
              <div className="h-14 w-14 shrink-0 rounded-2xl overflow-hidden border bg-background p-2">
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
              <div className="h-14 w-14 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                {sub.name[0]?.toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xl font-bold leading-tight truncate">
                {sub.name}
              </p>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                {sub.inactive ? (
                  <Badge variant="secondary" className="text-xs">
                    {t("inactive") || "Inactive"}
                  </Badge>
                ) : (
                  <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 text-xs">
                    {t("active") || "Active"}
                  </Badge>
                )}
                {cycle && (
                  <Badge variant="outline" className="text-xs">
                    {cycleLabel}
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-2xl font-extrabold leading-none">
                {formatPrice(sub.price, cur?.symbol ?? "$")}
              </p>
              {cur && mainCurrency && cur.id !== mainCurrency.id && (
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ {formatPrice(toMain(sub.price, cur), mainCurrency.symbol)}
                </p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {paymentTracking && (
            <div
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3.5",
                isPaid
                  ? "bg-green-500/10 border-green-500/20"
                  : isOverdue
                    ? "bg-red-500/10 border-red-500/20"
                    : "bg-muted/50 border-border",
              )}
            >
              {isPaid ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      {t("paid") || "Paid"}
                    </p>
                    {paymentRecord?.paid_at && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {new Date(paymentRecord.paid_at).toLocaleDateString()}
                        {paymentRecord.amount != null &&
                          ` · ${formatPrice(paymentRecord.amount, cur?.symbol ?? "$")}`}
                      </p>
                    )}
                  </div>
                  {proofUrl && (
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Eye className="h-3.5 w-3.5" />
                        {t("proof") || "Proof"}
                      </Button>
                    </a>
                  )}
                </>
              ) : isOverdue ? (
                <>
                  <CircleDot className="h-5 w-5 text-red-500 shrink-0" />
                  <p className="font-semibold text-red-700 dark:text-red-400">
                    {t("overdue") || "Overdue"} · {t("not_paid") || "Not paid"}
                  </p>
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                  <p className="font-medium text-muted-foreground">
                    {t("pending_payment") || "Pending payment"}
                  </p>
                </>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold mb-3">
                {t("details") || "Details"}
              </p>
              <div className="space-y-3">
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
                  <InfoRow
                    icon={<Tag className="h-4 w-4" />}
                    label={t("category") || "Category"}
                  >
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
                  <InfoRow
                    icon={<Users className="h-4 w-4" />}
                    label={t("payer") || "Payer"}
                  >
                    {payer.name}
                  </InfoRow>
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold mb-3">
                {t("more_info") || "More info"}
              </p>
              <div className="space-y-3">
                {sub.start_date && (
                  <InfoRow
                    icon={<Clock className="h-4 w-4" />}
                    label={t("start_date") || "Started"}
                  >
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
            </div>
          </div>

          {sub.notes && (
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-sm font-semibold mb-2">
                {t("notes") || "Notes"}
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {sub.notes}
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end flex-wrap border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              {t("close") || "Close"}
            </Button>
            {paymentTracking && !isPaid && (
              <Button
                variant="outline"
                className="border-green-500/40 text-green-700 dark:text-green-400 hover:bg-green-500/10"
                onClick={onMarkAsPaid}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t("mark_as_paid") || "Mark as Paid"}
              </Button>
            )}
            {paymentTracking && isPaid && (
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={onMarkAsPaid}
              >
                <FileText className="h-4 w-4 mr-2" />
                {t("view_payment") || "View payment"}
              </Button>
            )}
            <Button onClick={() => onEdit(sub)}>
              <Pencil className="h-4 w-4 mr-2" />
              {t("edit") || "Edit"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── MarkAsPaidModal ──────────────────────────────────────────────────────────

function MarkAsPaidModal({
  sub,
  date,
  userId,
  existingRecord,
  onClose,
  onSaved,
  t,
}: {
  sub: Subscription;
  date: Date;
  userId: string;
  existingRecord: PaymentRecord | undefined;
  onClose: () => void;
  onSaved: () => void;
  t: (k: string) => string;
}) {
  const cur = sub.expand?.currency;
  const dueDate = toDateStr(date);
  const isViewOnly = !!existingRecord?.paid_at;

  const [amount, setAmount] = useState(
    existingRecord?.amount != null
      ? String(existingRecord.amount)
      : String(sub.price),
  );
  const [notes, setNotes] = useState(existingRecord?.notes ?? "");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const proofUrl = existingRecord?.proof
    ? pb.files.getUrl(
        {
          collectionId: "payment_records",
          id: existingRecord.id,
        } as Parameters<typeof pb.files.getUrl>[0],
        existingRecord.proof,
      )
    : null;

  const mut = useMutation({
    mutationFn: async () => {
      const data: Record<string, unknown> = {
        subscription_id: sub.id,
        user: userId,
        due_date: dueDate,
        paid_at: new Date().toISOString(),
        amount: parseFloat(amount) || sub.price,
        notes: notes || undefined,
      };
      if (proofFile) data.proof = proofFile;

      let recordId = existingRecord?.id;

      if (!recordId) {
        const candidates = await pb
          .collection("payment_records")
          .getFullList<PaymentRecord>({
            filter: `subscription_id = "${sub.id}" && user = "${userId}"`,
          });

        const matched = candidates.find(
          (r) => toDateOnly(r.due_date) === dueDate,
        );
        recordId = matched?.id;
      }

      if (recordId) {
        const saved = await pb
          .collection("payment_records")
          .update<PaymentRecord>(recordId, data);
        if (!saved?.id)
          throw new Error("Falha ao atualizar registro de pagamento");
        return;
      }

      const saved = await pb
        .collection("payment_records")
        .create<PaymentRecord>(data);
      if (!saved?.id) throw new Error("Falha ao criar registro de pagamento");
    },
    onSuccess: () => {
      toast.success(t("marked_as_paid") || "Payment recorded!");
      onSaved();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    },
  });

  const logo = getLogoUrl(sub);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="border-b bg-card/70 backdrop-blur px-6 py-5">
          <DialogTitle className="flex items-center gap-4">
            {logo ? (
              <div className="h-12 w-12 shrink-0 rounded-2xl overflow-hidden border bg-background p-1.5">
                <img
                  src={logo}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
            ) : (
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center text-base font-bold text-primary">
                {sub.name[0]?.toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold leading-tight truncate">
                {isViewOnly
                  ? t("view_payment") || "Payment details"
                  : t("mark_as_paid") || "Mark as Paid"}
              </p>
              <p className="text-sm text-muted-foreground truncate mt-0.5">
                {sub.name} ·{" "}
                {date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>

            <Badge variant="outline" className="shrink-0">
              {formatPrice(sub.price, cur?.symbol ?? "$")}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-4 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="paid-amount">{t("amount") || "Amount"}</Label>
                <div className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2.5 focus-within:ring-2 focus-within:ring-primary/30">
                  <span className="text-sm text-muted-foreground shrink-0">
                    {cur?.symbol ?? "$"}
                  </span>
                  <input
                    id="paid-amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isViewOnly}
                    className="flex-1 bg-transparent text-sm font-medium outline-none disabled:opacity-60"
                  />
                  {cur?.code && (
                    <span className="text-xs text-muted-foreground shrink-0 font-medium">
                      {cur.code}
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="paid-notes">{t("notes") || "Notes"}</Label>
                <Textarea
                  id="paid-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  disabled={isViewOnly}
                  placeholder={t("optional") || "Optional…"}
                  rows={5}
                  className="resize-none rounded-xl"
                />
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <Label>{t("payment_proof") || "Payment proof"}</Label>

              {proofUrl ? (
                <a
                  href={proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm text-primary hover:bg-accent/40 transition-colors"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span
                    className="min-w-0 flex-1 truncate"
                    title={existingRecord?.proof}
                  >
                    {existingRecord?.proof}
                  </span>
                  <Eye className="h-4 w-4 shrink-0" />
                </a>
              ) : !isViewOnly ? (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    className="hidden"
                    onChange={(e) => setProofFile(e.target.files?.[0] ?? null)}
                  />

                  {proofFile ? (
                    <div className="flex min-w-0 items-center gap-2 rounded-xl border px-3 py-2.5 text-sm">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span
                        className="min-w-0 flex-1 truncate text-muted-foreground"
                        title={proofFile.name}
                      >
                        {proofFile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setProofFile(null)}
                        className="shrink-0 text-muted-foreground hover:text-foreground"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-3 py-8 text-sm text-muted-foreground hover:bg-accent/40 hover:border-primary/40 transition-colors"
                    >
                      <Upload className="h-4 w-4" />
                      {t("upload_proof") || "Upload proof (PDF or image)"}
                    </button>
                  )}

                  <p className="text-xs text-muted-foreground">
                    {t("proof_hint") || "PDF or image up to 15 MB"}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground rounded-xl border px-3 py-3">
                  {t("no_proof") || "No proof uploaded"}
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              {t("close") || "Close"}
            </Button>
            {!isViewOnly && (
              <Button
                onClick={() => mut.mutate()}
                disabled={mut.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {mut.isPending
                  ? t("saving") || "Saving…"
                  : t("confirm_payment") || "Confirm payment"}
              </Button>
            )}
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
