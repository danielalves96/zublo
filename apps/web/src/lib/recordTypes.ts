import type { Subscription } from "@/types";

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
