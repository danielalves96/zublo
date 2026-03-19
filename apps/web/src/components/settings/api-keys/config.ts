import type { ApiKeyPermission } from "@/types";

export interface PermissionDef {
  id: ApiKeyPermission;
  labelKey: string;
  descKey: string;
}

export interface PermissionGroupDef {
  id: string;
  labelKey: string;
}

export const API_KEY_PERMISSIONS: PermissionDef[] = [
  {
    id: "subscriptions:read",
    labelKey: "perm_subscriptions_read",
    descKey: "perm_subscriptions_read_desc",
  },
  {
    id: "subscriptions:write",
    labelKey: "perm_subscriptions_write",
    descKey: "perm_subscriptions_write_desc",
  },
  {
    id: "calendar:read",
    labelKey: "perm_calendar_read",
    descKey: "perm_calendar_read_desc",
  },
  {
    id: "statistics:read",
    labelKey: "perm_statistics_read",
    descKey: "perm_statistics_read_desc",
  },
  {
    id: "categories:read",
    labelKey: "perm_categories_read",
    descKey: "perm_categories_read_desc",
  },
  {
    id: "categories:write",
    labelKey: "perm_categories_write",
    descKey: "perm_categories_write_desc",
  },
  {
    id: "payment_methods:read",
    labelKey: "perm_payment_methods_read",
    descKey: "perm_payment_methods_read_desc",
  },
  {
    id: "payment_methods:write",
    labelKey: "perm_payment_methods_write",
    descKey: "perm_payment_methods_write_desc",
  },
  {
    id: "household:read",
    labelKey: "perm_household_read",
    descKey: "perm_household_read_desc",
  },
  {
    id: "household:write",
    labelKey: "perm_household_write",
    descKey: "perm_household_write_desc",
  },
  {
    id: "currencies:read",
    labelKey: "perm_currencies_read",
    descKey: "perm_currencies_read_desc",
  },
  {
    id: "currencies:write",
    labelKey: "perm_currencies_write",
    descKey: "perm_currencies_write_desc",
  },
];

export const API_KEY_PERMISSION_GROUPS: PermissionGroupDef[] = [
  { id: "subscriptions", labelKey: "subscriptions" },
  { id: "calendar", labelKey: "calendar" },
  { id: "statistics", labelKey: "statistics" },
  { id: "categories", labelKey: "categories" },
  { id: "payment_methods", labelKey: "payment_methods" },
  { id: "household", labelKey: "household" },
  { id: "currencies", labelKey: "currencies" },
];

export const API_KEY_PERMISSION_COLORS: Record<
  ApiKeyPermission,
  { badge: string }
> = {
  "subscriptions:read": {
    badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  "subscriptions:write": {
    badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  },
  "calendar:read": {
    badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  },
  "statistics:read": {
    badge: "bg-green-500/10 text-green-600 dark:text-green-400",
  },
  "categories:read": {
    badge: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
  },
  "categories:write": {
    badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "payment_methods:read": {
    badge: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
  },
  "payment_methods:write": {
    badge: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
  "household:read": {
    badge: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  },
  "household:write": {
    badge: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
  },
  "currencies:read": {
    badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400",
  },
  "currencies:write": {
    badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  },
};
