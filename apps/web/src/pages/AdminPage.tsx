import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Users, Settings, Mail, ShieldCheck,
  Shield, Database, CalendarClock, Wrench,
} from "lucide-react";

import { UsersTab } from "@/components/admin/UsersTab";
import { RegistrationTab } from "@/components/admin/RegistrationTab";
import { SMTPTab } from "@/components/admin/SMTPTab";
import { OIDCTab } from "@/components/admin/OIDCTab";
import { SecurityTab } from "@/components/admin/SecurityTab";
import { BackupTab } from "@/components/admin/BackupTab";
import { CronjobsTab } from "@/components/admin/CronjobsTab";
import { MaintenanceTab } from "@/components/admin/MaintenanceTab";

const TABS: Record<string, React.ComponentType> = {
  users: UsersTab,
  registration: RegistrationTab,
  smtp: SMTPTab,
  oidc: OIDCTab,
  security: SecurityTab,
  backup: BackupTab,
  cronjobs: CronjobsTab,
  maintenance: MaintenanceTab,
};

export function AdminPage() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") || "users";
  const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("no_permission")}</p>
      </div>
    );
  }

  const MENU_ITEMS = [
    { value: "users", label: t("users"), icon: Users },
    { value: "registration", label: t("registration"), icon: Settings },
    { value: "smtp", label: "SMTP", icon: Mail },
    { value: "oidc", label: "OIDC/SSO", icon: ShieldCheck },
    { value: "security", label: t("security"), icon: Shield },
    { value: "backup", label: t("backup"), icon: Database },
    { value: "cronjobs", label: t("cronjobs"), icon: CalendarClock },
    { value: "maintenance", label: t("maintenance"), icon: Wrench },
  ];

  const ActiveComponent = TABS[activeTab] ?? UsersTab;

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto min-h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0 space-y-1 md:sticky md:top-0 md:self-start">
        <h2 className="text-2xl font-bold mb-6 px-3 tracking-tight">{t("admin", "Admin")}</h2>
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
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-primary-foreground" : "opacity-70"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-card rounded-3xl border shadow-sm p-6 md:p-10 relative overflow-hidden flex flex-col">
        <ActiveComponent />
      </main>
    </div>
  );
}
