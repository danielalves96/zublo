import { subscriptionsService } from "@/services/subscriptions";
import type { Currency, Cycle, PaymentRecord,Subscription } from "@/types";

// ─── Sub-types ───────────────────────────────────────────────────────────────

export interface DayEntry {
  sub: Subscription;
  date: Date;
}

// ─── Category colors ─────────────────────────────────────────────────────────

export const EVENT_COLORS = [
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function toDateStr(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function toDateOnly(value: string | undefined | null): string {
  if (!value) return "";
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  if (match?.[0]) return match[0];
  return value.slice(0, 10);
}

export function getPaymentRecord(
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
      /* v8 ignore start */
      (a, b) =>
        new Date(b.paid_at ?? 0).getTime() - new Date(a.paid_at ?? 0).getTime(),
      /* v8 ignore stop */
    );

  return paid[0] ?? matches[0];
}

export function getOccurrencesInMonth(
  sub: Subscription,
  year: number,
  month: number,
  cycles: Cycle[],
): Date[] {
  if (sub.inactive) return [];

  const cycle = sub.expand?.cycle ?? cycles.find((c) => c.id === sub.cycle);
  const cycleName = cycle?.name ?? "Monthly";

  const freq = Math.max(1, sub.frequency || 1);

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0, 23, 59, 59);

  let cursor: Date;
  if (!sub.next_payment) return [];

  const datePart = sub.next_payment.split(/[T ]/)[0];
  const parts = datePart.split("-");
  if (parts.length >= 3) {
    const [py, pm, pd] = parts.map(Number);
    cursor = new Date(py, pm - 1, pd);
  } else {
    cursor = new Date(sub.next_payment);
  }

  // Preserve the intended day-of-month so month arithmetic never overflows.
  // e.g. a subscription on the 30th must land on the 30th (or last day of
  // shorter months), not silently drift when setMonth() wraps around.
  const originalDay = cursor.getDate();

  const addMonths = (d: Date, n: number): Date => {
    const targetMonth = d.getMonth() + n;
    const yr = d.getFullYear() + Math.floor(targetMonth / 12);
    const mo = ((targetMonth % 12) + 12) % 12;
    const daysInTarget = new Date(yr, mo + 1, 0).getDate();
    return new Date(yr, mo, Math.min(originalDay, daysInTarget));
  };

  const add = (d: Date): Date => {
    if (cycleName === "Daily") { const r = new Date(d); r.setDate(r.getDate() + freq); return r; }
    if (cycleName === "Weekly") { const r = new Date(d); r.setDate(r.getDate() + freq * 7); return r; }
    if (cycleName === "Monthly") return addMonths(d, freq);
    if (cycleName === "Yearly") return addMonths(d, freq * 12);
    return new Date(d);
  };

  const sub1 = (d: Date): Date => {
    if (cycleName === "Daily") { const r = new Date(d); r.setDate(r.getDate() - freq); return r; }
    if (cycleName === "Weekly") { const r = new Date(d); r.setDate(r.getDate() - freq * 7); return r; }
    if (cycleName === "Monthly") return addMonths(d, -freq);
    if (cycleName === "Yearly") return addMonths(d, -freq * 12);
    return new Date(d);
  };

  if (isNaN(cursor.getTime())) return [];

  let g = 0;
  while (cursor > monthStart && g++ < 600) {
    const prev = sub1(cursor);
    if (prev.getTime() >= cursor.getTime()) break;
    cursor = prev;
  }

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
export function toMain(price: number, cur: Currency | undefined): number {
  if (!cur || !cur.rate || cur.is_main) return price;
  return price / cur.rate;
}

export function getLogoUrl(sub: Subscription): string | null {
  return subscriptionsService.logoUrl(sub);
}

export function getColorForSub(sub: Subscription, index: number): string {
  const hash = sub.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return EVENT_COLORS[(hash + index) % EVENT_COLORS.length];
}
