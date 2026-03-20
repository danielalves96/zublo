import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

interface CalendarPageHeaderProps {
  onExport: () => void;
}

export function CalendarPageHeader({ onExport }: CalendarPageHeaderProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
      <div>
        <h1 className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-3xl font-extrabold tracking-tight text-transparent">
          {t("calendar")}
        </h1>
        <p className="mt-1 text-muted-foreground">{t("calendar_desc")}</p>
      </div>

      <Button
        variant="outline"
        className="w-full rounded-xl border bg-background/50 shadow-sm backdrop-blur sm:w-auto"
        onClick={onExport}
      >
        <Download className="mr-2 h-4 w-4" />
        {t("ical_export")}
      </Button>
    </div>
  );
}
