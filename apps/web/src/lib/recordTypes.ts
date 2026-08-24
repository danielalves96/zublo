import type { Subscription } from "@/types";

/**
 * Reserved for credits. A credit is always a single dated payout, and an
 * expense on this cycle has no recurring monthly equivalent — `toMonthly`
 * would fall through to its default branch and bill it every month forever.
 * The backend enforces the pairing on every write path.
 */
export const ONE_TIME_CYCLE = "One-Time";

export const normalizeRecordType = (value: Subscription["record_type"]): "expense" | "credit" =>
  value === "credit" ? "credit" : "expense";

export const isCredit = (subscription: Pick<Subscription, "record_type">) =>
  normalizeRecordType(subscription.record_type) === "credit";

export const isExpense = (subscription: Pick<Subscription, "record_type">) =>
  !isCredit(subscription);

export function isDateInMonth(value: string, date: Date): boolean {
  const prefix = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-`;
  return value.slice(0, 10).startsWith(prefix);
}

/** Cache-key fragment for "the month we are currently in", e.g. "2026-08". */
export function currentMonthKey(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
