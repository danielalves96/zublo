import type { ComponentType } from "react";
import type { TFunction } from "i18next";
import {
  Banknote,
  Bell,
  Bot,
  CreditCard,
  Key,
  Monitor,
  Palette,
  ShieldAlert,
  Tags,
  Trash2,
  TrendingUp,
  User,
  Users,
} from "lucide-react";
import { AITab } from "@/components/settings/ai/AITab";
import { ApiKeyTab } from "@/components/settings/api-keys/ApiKeyTab";
import { CategoriesTab } from "@/components/settings/categories/CategoriesTab";
import { CurrenciesTab } from "@/components/settings/currencies/CurrenciesTab";
import { DeleteAccountTab } from "@/components/settings/delete-account/DeleteAccountTab";
import { DisplayTab } from "@/components/settings/display/DisplayTab";
import { FixerTab } from "@/components/settings/exchange-rates/FixerTab";
import { HouseholdTab } from "@/components/settings/household/HouseholdTab";
import { NotificationsTab } from "@/components/settings/notifications/NotificationsTab";
import { PaymentMethodsTab } from "@/components/settings/payment-methods/PaymentMethodsTab";
import { ProfileTab } from "@/components/settings/profile/ProfileTab";
import { ThemeTab } from "@/components/settings/theme/ThemeTab";
import { TwoFactorTab } from "@/components/settings/two-factor/TwoFactorTab";
import type { SidebarTabsLayoutItem } from "@/components/ui/SidebarTabsLayout";

export type SettingsTabKey =
  | "profile"
  | "2fa"
  | "categories"
  | "household"
  | "currencies"
  | "payment_methods"
  | "display"
  | "theme"
  | "notifications"
  | "ai"
  | "api_key"
  | "exchange_rates"
  | "delete";

export const SETTINGS_TAB_COMPONENTS: Record<SettingsTabKey, ComponentType> = {
  profile: ProfileTab,
  "2fa": TwoFactorTab,
  categories: CategoriesTab,
  household: HouseholdTab,
  currencies: CurrenciesTab,
  payment_methods: PaymentMethodsTab,
  display: DisplayTab,
  theme: ThemeTab,
  notifications: NotificationsTab,
  ai: AITab,
  api_key: ApiKeyTab,
  exchange_rates: FixerTab,
  delete: DeleteAccountTab,
};

export function getSettingsPageMenuItems(
  t: TFunction,
): SidebarTabsLayoutItem<SettingsTabKey>[] {
  return [
    { value: "profile", label: t("profile"), icon: User },
    { value: "2fa", label: "2FA", icon: ShieldAlert },
    { value: "categories", label: t("categories"), icon: Tags },
    { value: "household", label: t("household"), icon: Users },
    { value: "currencies", label: t("currencies"), icon: Banknote },
    {
      value: "payment_methods",
      label: t("payment_methods"),
      icon: CreditCard,
    },
    { value: "display", label: t("display"), icon: Monitor },
    { value: "theme", label: t("theme"), icon: Palette },
    { value: "notifications", label: t("notifications"), icon: Bell },
    { value: "ai", label: t("ai_settings"), icon: Bot },
    { value: "api_key", label: t("api_key"), icon: Key },
    {
      value: "exchange_rates",
      label: t("fixer_api"),
      icon: TrendingUp,
    },
    {
      value: "delete",
      label: t("delete_account"),
      icon: Trash2,
      danger: true,
    },
  ];
}
