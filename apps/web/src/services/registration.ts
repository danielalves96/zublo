/**
 * Whether this instance is currently accepting new accounts.
 *
 * admin_settings is admin-only, so the public auth pages cannot read
 * `open_registrations` directly and ask this endpoint instead. The server
 * enforces the same policy on the create request itself, so a stale or
 * failed answer here only affects what the page offers, never what the
 * backend accepts.
 */
export const registrationService = {
  isOpen: async (): Promise<boolean> => {
    const res = await fetch("/api/auth/registration-status", { cache: "no-store" });
    if (!res.ok) throw new Error("registration status unavailable");

    const data: unknown = await res.json();
    return !!(data as { open?: boolean })?.open;
  },
};
