/**
 * Centralised query key factory.
 *
 * Rules:
 * - All keys are `as const` tuples for precise inference and easy invalidation.
 * - User-scoped keys include `userId` so the cache is isolated per account.
 * - Prefer `queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all(uid) })`
 *   to invalidate an entire domain at once (also invalidates narrower keys below it).
 */

export const queryKeys = {
  // ─── User profile ─────────────────────────────────────────────────────────
  user: () => ["user"] as const,
  mainCurrency: (userId: string) => ["main-currency", userId] as const,

  // ─── Subscriptions ────────────────────────────────────────────────────────
  subscriptions: {
    all: (userId: string) => ["subscriptions", userId] as const,
  },

  // ─── Currencies ───────────────────────────────────────────────────────────
  currencies: {
    all: (userId: string) => ["currencies", userId] as const,
  },

  // ─── Categories ───────────────────────────────────────────────────────────
  categories: {
    all: (userId: string) => ["categories", userId] as const,
  },

  // ─── Payment methods ──────────────────────────────────────────────────────
  paymentMethods: {
    all: (userId: string) => ["payment_methods", userId] as const,
  },

  // ─── Household ────────────────────────────────────────────────────────────
  household: {
    all: (userId: string) => ["household", userId] as const,
  },

  // ─── Payment records ──────────────────────────────────────────────────────
  paymentRecords: {
    all: (userId: string) => ["payment_records", userId] as const,
    forMonth: (userId: string, year: number, month: number) =>
      ["payment_records", userId, year, month] as const,
  },

  // ─── Cycles (global, not user-scoped) ─────────────────────────────────────
  cycles: () => ["cycles"] as const,

  // ─── Dashboard / summary ──────────────────────────────────────────────────
  dashboard: (userId: string) => ["dashboard", userId] as const,

  // ─── Yearly costs ─────────────────────────────────────────────────────────
  yearlyCosts: {
    all: (userId: string) => ["yearly-costs", userId] as const,
  },

  // ─── AI ───────────────────────────────────────────────────────────────────
  aiSettings: (userId: string) => ["ai_settings", userId] as const,
  aiRecommendations: {
    all: (userId: string) => ["ai-recommendations", userId] as const,
  },

  // ─── Notifications ────────────────────────────────────────────────────────
  notificationsConfig: (userId: string) =>
    ["notifications_config", userId] as const,

  // ─── API Keys ─────────────────────────────────────────────────────────────
  apiKeys: (userId: string) => ["api-keys", userId] as const,

  // ─── Admin ────────────────────────────────────────────────────────────────
  admin: {
    users: () => ["admin-users"] as const,
    settings: () => ["admin-settings"] as const,
    smtp: () => ["admin-smtp"] as const,
  },
} as const;
