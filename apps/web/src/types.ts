// PocketBase record types for Zublo

export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  avatar?: string;
  language?: string;
  main_currency?: string;
  totp_enabled?: boolean;
  totp_configured?: boolean;
  color_theme?: string;
  custom_theme_colors?: Record<string, string>;
  custom_css?: string;
  dark_theme_mode?: number; // 0=light, 1=dark, 2=auto
  monthly_price?: boolean;
  show_original_price?: boolean;
  hide_disabled?: boolean;
  disabled_to_bottom?: boolean;
  subscription_progress?: boolean;
  mobile_navigation?: boolean;
  remove_background?: boolean;
  convert_currency?: boolean;
  budget?: number;
  payment_tracking?: boolean;
}

export interface PaymentRecord {
  id: string;
  subscription_id: string;
  user: string;
  due_date: string;       // YYYY-MM-DD
  paid_at?: string;       // ISO datetime
  auto_paid?: boolean;
  amount?: number;
  notes?: string;
  proof?: string;         // filename
}

export interface Subscription {
  id: string;
  name: string;
  logo?: string;
  price: number;
  currency: string;
  frequency: number;
  cycle: string;
  next_payment: string;
  auto_renew: boolean;
  start_date: string;
  payment_method?: string;
  payer?: string;
  category?: string;
  notes?: string;
  url?: string;
  notify: boolean;
  notify_days_before: number;
  inactive: boolean;
  auto_mark_paid?: boolean;
  cancellation_date?: string;
  replacement_subscription?: string;
  user: string;
  // Expanded relations
  expand?: {
    currency?: Currency;
    cycle?: Cycle;
    category?: Category;
    payment_method?: PaymentMethod;
    payer?: Household;
  };
}

export interface Currency {
  id: string;
  name: string;
  code: string;
  symbol: string;
  rate: number;
  is_main: boolean;
  user: string;
}

export interface Category {
  id: string;
  name: string;
  user: string;
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon?: string;
  order?: number;
  user: string;
}

export interface Household {
  id: string;
  name: string;
  user: string;
}

export interface Cycle {
  id: string;
  name: "Daily" | "Weekly" | "Monthly" | "Yearly";
}

export interface Frequency {
  id: string;
  name: string;
  cycle: string;
  value: number;
}

export interface NotificationReminder {
  days: number; // 0 = on payment day, 1 = 1 day before, etc.
  hour: number; // 0–23
}

export interface NotificationsConfig {
  id: string;
  user: string;
  reminders?: NotificationReminder[];
  // Email
  email_enabled?: boolean;
  email_to?: string;
  // Discord
  discord_enabled?: boolean;
  discord_webhook_url?: string;
  // Telegram
  telegram_enabled?: boolean;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  // Gotify
  gotify_enabled?: boolean;
  gotify_url?: string;
  gotify_token?: string;
  // Pushover
  pushover_enabled?: boolean;
  pushover_user_key?: string;
  pushover_api_token?: string;
  // ntfy
  ntfy_enabled?: boolean;
  ntfy_url?: string;
  ntfy_topic?: string;
  // Pushplus
  pushplus_enabled?: boolean;
  pushplus_token?: string;
  // Mattermost
  mattermost_enabled?: boolean;
  mattermost_webhook_url?: string;
  // Webhook
  webhook_enabled?: boolean;
  webhook_url?: string;
  // Serverchan
  serverchan_enabled?: boolean;
  serverchan_send_key?: string;
}

export interface FixerSettings {
  id: string;
  user: string;
  enabled: boolean;
  api_key?: string;
  api_key_configured?: boolean;
  provider: "fixer" | "apilayer";
  base_currency?: string;
}

export interface AISettings {
  id: string;
  user: string;
  enabled: boolean;
  type: "chatgpt" | "gemini" | "openrouter" | "ollama";
  name?: string;
  api_key?: string;
  api_key_configured?: boolean;
  model?: string;
  url?: string;
}

export interface AIRecommendation {
  id: string;
  user: string;
  type: string;
  title: string;
  description: string;
  savings: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  isError?: boolean;
  aiContent?: string;
}

export interface ChatActionTaken {
  tool: string;
  result: Record<string, unknown>;
}

export interface ChatResponse {
  message: string;
  actions_taken?: ChatActionTaken[];
  conversation_id: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  created: string;
  updated: string;
}

export interface AdminSettings {
  id: string;
  open_registrations: boolean;
  max_users?: number;
  require_email_validation?: boolean;
  server_url?: string;
  disable_login: boolean;
  update_notification: boolean;
  oidc_enabled?: boolean;
  oidc_provider_name?: string;
  oidc_display_name?: string;
  oidc_client_id?: string;
  oidc_client_secret?: string;
  oidc_client_secret_configured?: boolean;
  oidc_issuer_url?: string;
  oidc_redirect_url?: string;
  oidc_redirect_uri?: string;
  oidc_scopes?: string;
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_pass?: string;
  smtp_email?: string;
  smtp_from_name?: string;
  smtp_encryption?: string;
  smtp_enabled?: boolean;
}

export interface YearlyCost {
  id: string;
  user: string;
  year: number;
  month: number;
  total: number;
}

// ─── API Keys ─────────────────────────────────────────────────────────────────

export type ApiKeyPermission =
  | "subscriptions:read"
  | "subscriptions:write"
  | "calendar:read"
  | "statistics:read"
  | "categories:read"
  | "categories:write"
  | "payment_methods:read"
  | "payment_methods:write"
  | "household:read"
  | "household:write"
  | "currencies:read"
  | "currencies:write";

export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  permissions: ApiKeyPermission[];
  last_used_at: string | null;
  created: string;
}

/** Returned only once, immediately after creation */
export interface ApiKeyCreated extends ApiKey {
  key: string;
}

export type SortOption = "name" | "price" | "date" | "status";
export type FilterState = {
  category: string[];
  member: string[];
  payment: string[];
  state: "all" | "active" | "inactive";
};

export type SettingsSearch = { tab?: string };
export type AdminSearch = { tab?: string };
