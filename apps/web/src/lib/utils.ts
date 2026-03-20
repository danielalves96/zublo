import { type ClassValue,clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import { subscriptionsService } from "@/services/subscriptions";
import type { Currency,Subscription } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Convert a price to the main currency using exchange rates. */
export function toMainCurrency(price: number, cur: Currency | undefined): number {
  if (!cur || !cur.rate || cur.is_main) return price;
  return price / cur.rate;
}

/** Get the full URL for a subscription logo, or null. */
export function getLogoUrl(sub: Subscription): string | null {
  return subscriptionsService.logoUrl(sub);
}

/** Color palette for calendar chips and charts. */
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

/** Stable color for a subscription based on its ID hash. */
export function getColorForSub(sub: Subscription, index: number): string {
  const hash = sub.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return EVENT_COLORS[(hash + index) % EVENT_COLORS.length];
}

/**
 * Format a price with a currency symbol.
 */
export function formatPrice(
  price: number,
  symbol: string,
  locale = "en-US",
): string {
  try {
    return (
      new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(price) +
      " " +
      symbol
    );
  } catch {
    return price.toFixed(2) + " " + symbol;
  }
}

/**
 * Convert a price to monthly based on cycle name and frequency.
 */
export function toMonthly(
  price: number,
  cycleName: string,
  frequency: number,
): number {
  const f = frequency || 1;
  switch (cycleName) {
    case "Daily":
      return (price / f) * 30.44;
    case "Weekly":
      return (price / f) * (52 / 12);
    case "Monthly":
      return price / f;
    case "Yearly":
      return price / (f * 12);
    default:
      return price;
  }
}

/**
 * Format a date string as localized short date.
 */
export function formatDate(dateStr: string, locale = "en-US"): string {
  if (!dateStr) return "";
  try {
    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(parseLocalDate(dateStr));
  } catch {
    return dateStr;
  }
}

/** Parse a "YYYY-MM-DD" string as local midnight (avoids UTC shift). */
function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

/**
 * Returns a URL only if it uses http or https protocol.
 * Returns null for javascript:, data:, vbscript:, or any other unsafe protocol.
 */
export function sanitizeHref(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return url;
    }
  } catch {
    // Not a valid absolute URL — could be relative or malformed; reject
  }
  return null;
}

/**
 * Days until a date.
 */
export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(dateStr);
  return Math.ceil(
    (target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
}

/**
 * Progress percentage between start date and next payment.
 */
export function subscriptionProgress(
  startDate: string,
  nextPayment: string,
): number {
  if (!startDate || !nextPayment) return 0;
  const start = parseLocalDate(startDate).getTime();
  const end = parseLocalDate(nextPayment).getTime();
  const now = Date.now();
  if (end <= start) return 100;
  return Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
}
