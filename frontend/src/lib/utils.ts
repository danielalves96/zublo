import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
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
