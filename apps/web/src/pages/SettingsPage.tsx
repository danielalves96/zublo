import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import {
  getSettingsPageMenuItems,
  SETTINGS_TAB_COMPONENTS,
  type SettingsTabKey,
} from "@/components/settings/settingsPage.config";
import { SidebarTabsLayout } from "@/components/ui/SidebarTabsLayout";
import { settingsRoute } from "@/routes";

export function SettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const search = settingsRoute.useSearch();
  const activeTab = (search.tab ?? "profile") as SettingsTabKey;
  const menuItems = getSettingsPageMenuItems(t);
  const setActiveTab = (tab: SettingsTabKey) =>
    navigate({ to: "/settings", search: { tab }, replace: true });
  const ActiveComponent =
    SETTINGS_TAB_COMPONENTS[activeTab] ?? SETTINGS_TAB_COMPONENTS.profile;

  return (
    <SidebarTabsLayout
      title={t("settings")}
      items={menuItems}
      activeValue={activeTab}
      onValueChange={setActiveTab}
    >
      <ActiveComponent />
    </SidebarTabsLayout>
  );
}
