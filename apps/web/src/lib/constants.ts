/**
 * Centralized constants — single source of truth for magic strings.
 * Import from here instead of hardcoding values across the codebase.
 */

/** localStorage keys used across the application. */
export const LS_KEYS = {
  LANGUAGE: "zublo_language",
  COLOR_THEME: "zublo_color_theme",
  /** Returns the trusted-device key for a given user (TOTP remember-device). */
  totpTrusted: (userId: string) => `totp_trusted_${userId}`,
} as const;

/** sessionStorage keys used across the application. */
export const SS_KEYS = {
  TOTP_LOGIN_CHALLENGE: "zublo_totp_login_challenge",
} as const;
