import type { TFunction } from "i18next";
import {
  CalendarClock,
  Database,
  Mail,
  Settings,
  Shield,
  ShieldCheck,
  Users,
  Wrench,
} from "lucide-react";
import type { ComponentType } from "react";

import { BackupTab } from "@/components/admin/backup/BackupTab";
import { CronjobsTab } from "@/components/admin/cronjobs/CronjobsTab";
import { MaintenanceTab } from "@/components/admin/maintenance/MaintenanceTab";
import { OIDCTab } from "@/components/admin/oidc/OIDCTab";
import { RegistrationTab } from "@/components/admin/registration/RegistrationTab";
import { SecurityTab } from "@/components/admin/security/SecurityTab";
import { SMTPTab } from "@/components/admin/smtp/SMTPTab";
import { UsersTab } from "@/components/admin/users/UsersTab";
import type { SidebarTabsLayoutItem } from "@/components/ui/SidebarTabsLayout";

export type AdminTabKey =
  | "users"
  | "registration"
  | "smtp"
  | "oidc"
  | "security"
  | "backup"
  | "cronjobs"
  | "maintenance";

export const ADMIN_TAB_COMPONENTS: Record<AdminTabKey, ComponentType> = {
  users: UsersTab,
  registration: RegistrationTab,
  smtp: SMTPTab,
  oidc: OIDCTab,
  security: SecurityTab,
  backup: BackupTab,
  cronjobs: CronjobsTab,
  maintenance: MaintenanceTab,
};

export function getAdminPageMenuItems(
  t: TFunction,
): SidebarTabsLayoutItem<AdminTabKey>[] {
  return [
    { value: "users", label: t("users"), icon: Users },
    { value: "registration", label: t("registration"), icon: Settings },
    { value: "smtp", label: "SMTP", icon: Mail },
    { value: "oidc", label: "OIDC/SSO", icon: ShieldCheck },
    { value: "security", label: t("security"), icon: Shield },
    { value: "backup", label: t("backup"), icon: Database },
    { value: "cronjobs", label: t("cronjobs"), icon: CalendarClock },
    { value: "maintenance", label: t("maintenance"), icon: Wrench },
  ];
}
