import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import {
  ADMIN_TAB_COMPONENTS,
  type AdminTabKey,
  getAdminPageMenuItems,
} from "@/components/admin/adminPage.config";
import { SidebarTabsLayout } from "@/components/ui/SidebarTabsLayout";
import { useAuth } from "@/contexts/AuthContext";
import { adminRoute } from "@/routes";

export function AdminPage() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const search = adminRoute.useSearch();
  const activeTab = (search.tab ?? "users") as AdminTabKey;
  const menuItems = getAdminPageMenuItems(t);
  const setActiveTab = (tab: AdminTabKey) =>
    navigate({ to: "/admin", search: { tab }, replace: true });

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("no_permission")}</p>
      </div>
    );
  }

  const ActiveComponent =
    ADMIN_TAB_COMPONENTS[activeTab] ?? ADMIN_TAB_COMPONENTS.users;

  return (
    <SidebarTabsLayout
      title={t("admin", "Admin")}
      items={menuItems}
      activeValue={activeTab}
      onValueChange={setActiveTab}
    >
      <ActiveComponent />
    </SidebarTabsLayout>
  );
}
