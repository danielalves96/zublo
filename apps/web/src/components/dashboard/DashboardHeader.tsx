import { useTranslation } from "react-i18next";
import { Activity } from "lucide-react";

interface DashboardHeaderProps {
  userName?: string;
  activeSubscriptions: number;
}

export function DashboardHeader({
  userName,
  activeSubscriptions,
}: DashboardHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
      <div>
        <h1 className="bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-4xl font-extrabold tracking-tight text-transparent">
          {t("dashboard")}
        </h1>
        <p className="mt-1 text-lg text-muted-foreground">
          {t("welcome_back")},{" "}
          <span className="font-semibold text-foreground">{userName}</span>.{" "}
          {t("financial_overview")}
        </p>
      </div>

      <div className="flex items-center gap-2 rounded-full border bg-card px-4 py-2 text-sm font-medium shadow-sm">
        <Activity className="h-4 w-4 animate-pulse text-primary" />
        <span>
          {t("active_subscriptions")}:{" "}
          <span className="font-bold text-primary">{activeSubscriptions}</span>
        </span>
      </div>
    </div>
  );
}
