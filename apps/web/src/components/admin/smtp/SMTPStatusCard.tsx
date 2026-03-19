import { useTranslation } from "react-i18next";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SMTPStatusCardProps {
  enabled: boolean;
  onEnabledChange: (value: boolean) => void;
}

export function SMTPStatusCard({
  enabled,
  onEnabledChange,
}: SMTPStatusCardProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div>
        <Label className="font-semibold text-primary">{t("enabled")}</Label>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("smtp_enable_description")}
        </p>
      </div>
      <Switch checked={enabled} onCheckedChange={onEnabledChange} />
    </div>
  );
}
