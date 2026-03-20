import type { Currency, Subscription } from "@/types";

// Mock PocketBase-dependent service before importing utils
vi.mock("@/services/subscriptions", () => ({
  subscriptionsService: {
    logoUrl: vi.fn().mockReturnValue(null),
  },
}));

import {
  cn,
  daysUntil,
  formatDate,
  formatPrice,
  getColorForSub,
  sanitizeHref,
  subscriptionProgress,
  toMainCurrency,
  toMonthly,
} from "./utils";

// ---------------------------------------------------------------------------
// cn
// ---------------------------------------------------------------------------
describe("cn", () => {
  it("merges class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("deduplicates conflicting Tailwind classes (last wins)", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
  });

  it("ignores falsy values", () => {
    expect(cn("foo", false && "bar", undefined, null, "baz")).toBe("foo baz");
  });
});

// ---------------------------------------------------------------------------
// toMainCurrency
// ---------------------------------------------------------------------------
describe("toMainCurrency", () => {
  const usd: Currency = {
    id: "1",
    name: "US Dollar",
    code: "USD",
    symbol: "$",
    rate: 5,
    is_main: false,
    user: "u1",
  };

  const brl: Currency = {
    id: "2",
    name: "Brazilian Real",
    code: "BRL",
    symbol: "R$",
    rate: 1,
    is_main: true,
    user: "u1",
  };

  it("divides price by rate when currency is not main", () => {
    expect(toMainCurrency(100, usd)).toBeCloseTo(20);
  });

  it("returns original price when currency is main", () => {
    expect(toMainCurrency(100, brl)).toBe(100);
  });

  it("returns original price when currency is undefined", () => {
    expect(toMainCurrency(50, undefined)).toBe(50);
  });

  it("returns original price when rate is falsy (0)", () => {
    const zeroCur: Currency = { ...usd, rate: 0 };
    expect(toMainCurrency(50, zeroCur)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// formatPrice
// ---------------------------------------------------------------------------
describe("formatPrice", () => {
  it("formats price with symbol", () => {
    expect(formatPrice(9.99, "$")).toBe("9.99 $");
  });

  it("always shows two decimal places", () => {
    expect(formatPrice(10, "€")).toBe("10.00 €");
  });

  it("respects custom locale (pt-BR uses comma separator)", () => {
    const result = formatPrice(1000, "R$", "pt-BR");
    // pt-BR uses period as thousands separator and comma as decimal
    expect(result).toContain("R$");
    expect(result).toMatch(/1[.,]000,00/);
  });

  it("falls back gracefully on invalid locale", () => {
    // Invalid locale should not throw — fallback uses toFixed(2)
    const result = formatPrice(5.5, "X", "invalid-locale-xyz");
    expect(result).toContain("X");
  });
});

// ---------------------------------------------------------------------------
// toMonthly
// ---------------------------------------------------------------------------
describe("toMonthly", () => {
  it("converts daily price (frequency 1) to monthly", () => {
    expect(toMonthly(1, "Daily", 1)).toBeCloseTo(30.44);
  });

  it("converts weekly price to monthly", () => {
    expect(toMonthly(1, "Weekly", 1)).toBeCloseTo(52 / 12);
  });

  it("returns price unchanged for Monthly / frequency 1", () => {
    expect(toMonthly(10, "Monthly", 1)).toBe(10);
  });

  it("divides monthly price by frequency > 1", () => {
    // Every 3 months → monthly cost is price / 3
    expect(toMonthly(30, "Monthly", 3)).toBeCloseTo(10);
  });

  it("converts yearly price to monthly", () => {
    expect(toMonthly(120, "Yearly", 1)).toBeCloseTo(10);
  });

  it("converts every 2 years to monthly", () => {
    expect(toMonthly(240, "Yearly", 2)).toBeCloseTo(10);
  });

  it("treats frequency 0 as 1 (avoids division by zero)", () => {
    expect(toMonthly(10, "Monthly", 0)).toBe(10);
  });

  it("returns price unchanged for unknown cycle", () => {
    expect(toMonthly(50, "Quarterly", 1)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------
describe("formatDate", () => {
  it("formats a YYYY-MM-DD string", () => {
    const result = formatDate("2024-01-15", "en-US");
    expect(result).toMatch(/Jan/);
    expect(result).toMatch(/15/);
    expect(result).toMatch(/2024/);
  });

  it("returns empty string for empty input", () => {
    expect(formatDate("")).toBe("");
  });

  it("returns the original string on parse failure", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });

  it("respects locale (pt-BR shows day first)", () => {
    const result = formatDate("2024-06-01", "pt-BR");
    // pt-BR format: "1 de jun. de 2024"
    expect(result).toContain("2024");
    expect(result).toMatch(/1/);
  });
});

// ---------------------------------------------------------------------------
// sanitizeHref
// ---------------------------------------------------------------------------
describe("sanitizeHref", () => {
  it("allows https URLs", () => {
    expect(sanitizeHref("https://example.com")).toBe("https://example.com");
  });

  it("allows http URLs", () => {
    expect(sanitizeHref("http://example.com")).toBe("http://example.com");
  });

  it("blocks javascript: protocol", () => {
    expect(sanitizeHref("javascript:alert(1)")).toBeNull();
  });

  it("blocks data: protocol", () => {
    expect(sanitizeHref("data:text/html,<h1>XSS</h1>")).toBeNull();
  });

  it("blocks vbscript: protocol", () => {
    expect(sanitizeHref("vbscript:MsgBox(1)")).toBeNull();
  });

  it("returns null for null input", () => {
    expect(sanitizeHref(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(sanitizeHref(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(sanitizeHref("")).toBeNull();
  });

  it("returns null for relative paths", () => {
    // Relative paths aren't valid absolute URLs — rejected for safety
    expect(sanitizeHref("/relative/path")).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getColorForSub
// ---------------------------------------------------------------------------
describe("getColorForSub", () => {
  const makeSub = (id: string): Subscription =>
    ({
      id,
      name: "Test",
      price: 0,
      currency: "",
      frequency: 1,
      cycle: "Monthly",
      next_payment: "2024-12-01",
      auto_renew: true,
      start_date: "2024-01-01",
      notify: false,
      notify_days_before: 0,
      inactive: false,
      user: "u1",
    }) as Subscription;

  it("returns a non-empty string", () => {
    expect(getColorForSub(makeSub("abc"), 0)).toBeTruthy();
  });

  it("is deterministic — same id and index always returns same color", () => {
    const sub = makeSub("abc");
    expect(getColorForSub(sub, 0)).toBe(getColorForSub(sub, 0));
  });

  it("different indexes produce different colors for the same sub", () => {
    const sub = makeSub("abc");
    const colors = Array.from({ length: 10 }, (_, i) => getColorForSub(sub, i));
    // At least two distinct colors should appear across 10 indices
    expect(new Set(colors).size).toBeGreaterThan(1);
  });

  it("returned value is one of the known EVENT_COLORS entries", () => {
    const sub = makeSub("xyz");
    const color = getColorForSub(sub, 0);
    expect(color).toMatch(/bg-\w+-500/);
  });
});

// ---------------------------------------------------------------------------
// daysUntil
// ---------------------------------------------------------------------------
describe("daysUntil", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Use local-time constructor to avoid UTC-midnight timezone shifts
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0)); // June 15, 2024 noon local
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 for today", () => {
    expect(daysUntil("2024-06-15")).toBe(0);
  });

  it("returns positive days for a future date", () => {
    expect(daysUntil("2024-06-20")).toBe(5);
  });

  it("returns negative days for a past date", () => {
    expect(daysUntil("2024-06-10")).toBe(-5);
  });
});

// ---------------------------------------------------------------------------
// subscriptionProgress
// ---------------------------------------------------------------------------
describe("subscriptionProgress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Use local-time constructor to avoid UTC-midnight timezone shifts
    vi.setSystemTime(new Date(2024, 5, 15, 12, 0, 0)); // June 15, 2024 noon local
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 0 when both dates are empty", () => {
    expect(subscriptionProgress("", "")).toBe(0);
  });

  it("returns 100 when end date is before start date", () => {
    expect(subscriptionProgress("2024-06-20", "2024-06-10")).toBe(100);
  });

  it("returns 100 when end date equals start date", () => {
    expect(subscriptionProgress("2024-06-15", "2024-06-15")).toBe(100);
  });

  it("returns ~50% at midpoint between start and end", () => {
    // start = June 1, end = June 29 → now (June 15) is roughly midpoint
    const progress = subscriptionProgress("2024-06-01", "2024-06-29");
    expect(progress).toBeGreaterThan(40);
    expect(progress).toBeLessThan(60);
  });

  it("clamps to 0 when now is before start", () => {
    expect(subscriptionProgress("2024-07-01", "2024-07-31")).toBe(0);
  });

  it("clamps to 100 when now is after end", () => {
    expect(subscriptionProgress("2024-01-01", "2024-05-01")).toBe(100);
  });
});
