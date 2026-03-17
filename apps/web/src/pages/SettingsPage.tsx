import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  User,
  ShieldAlert,
  Tags,
  Users,
  Banknote,
  CreditCard,
  Monitor,
  Palette,
  Bell,
  Bot,
  Key,
  Trash2,
} from "lucide-react";

import { ProfileTab } from "@/components/settings/ProfileTab";
import { TwoFactorTab } from "@/components/settings/TwoFactorTab";
import { CategoriesTab } from "@/components/settings/CategoriesTab";
import { HouseholdTab } from "@/components/settings/HouseholdTab";
import { CurrenciesTab } from "@/components/settings/CurrenciesTab";
import { PaymentMethodsTab } from "@/components/settings/PaymentMethodsTab";
import { DisplayTab } from "@/components/settings/DisplayTab";
import { ThemeTab } from "@/components/settings/ThemeTab";
import { NotificationsTab } from "@/components/settings/NotificationsTab";
import { AITab } from "@/components/settings/AITab";
import { ApiKeyTab } from "@/components/settings/ApiKeyTab";
import { DeleteAccountTab } from "@/components/settings/DeleteAccountTab";

export function SettingsPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "profile";
  const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  const MENU_ITEMS = [
    { value: "profile", label: t("profile"), icon: User },
    { value: "2fa", label: "2FA", icon: ShieldAlert },
    { value: "categories", label: t("categories"), icon: Tags },
    { value: "household", label: t("household"), icon: Users },
    { value: "currencies", label: t("currencies"), icon: Banknote },
    { value: "payment_methods", label: t("payment_methods"), icon: CreditCard },
    { value: "display", label: t("display"), icon: Monitor },
    { value: "theme", label: t("theme"), icon: Palette },
    { value: "notifications", label: t("notifications"), icon: Bell },
    { value: "ai", label: t("ai_settings"), icon: Bot },
    { value: "api_key", label: t("api_key"), icon: Key },
    { value: "delete", label: t("delete_account"), icon: Trash2, danger: true },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case "profile":
        return <ProfileTab />;
      case "2fa":
        return <TwoFactorTab />;
      case "categories":
        return <CategoriesTab />;
      case "household":
        return <HouseholdTab />;
      case "currencies":
        return <CurrenciesTab />;
      case "payment_methods":
        return <PaymentMethodsTab />;
      case "display":
        return <DisplayTab />;
      case "theme":
        return <ThemeTab />;
      case "notifications":
        return <NotificationsTab />;
      case "ai":
        return <AITab />;
      case "api_key":
        return <ApiKeyTab />;
      case "delete":
        return <DeleteAccountTab />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto min-h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0 space-y-1 md:sticky md:top-0 md:self-start">
        <h2 className="text-2xl font-bold mb-6 px-3 tracking-tight">
          {t("settings")}
        </h2>
        <nav className="flex flex-col space-y-1">
          {MENU_ITEMS.map((item) => {
            const isActive = activeTab === item.value;
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                onClick={() => setActiveTab(item.value)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-left ${
                  isActive
                    ? item.danger
                      ? "bg-destructive/10 text-destructive dark:bg-destructive/20"
                      : "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${isActive && !item.danger ? "text-primary-foreground" : "opacity-70"}`}
                />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-card rounded-3xl border shadow-sm p-6 md:p-10 relative overflow-hidden flex flex-col">
        {renderActiveTab()}
      </main>
    </div>
  );
}
