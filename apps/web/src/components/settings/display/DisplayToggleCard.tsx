import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface DisplayToggleCardProps {
  checked: boolean;
  description: string;
  label: string;
  onToggle: () => void;
}

export function DisplayToggleCard({
  checked,
  description,
  label,
  onToggle,
}: DisplayToggleCardProps) {
  const { t } = useTranslation();

  return (
    <div className="flex items-start justify-between gap-4 rounded-2xl border bg-card p-4 hover:bg-muted/30 transition-colors">
      <div className="space-y-0.5">
        <Label className="text-base font-medium cursor-pointer">{label}</Label>
        <p className="text-sm text-muted-foreground">
          {description || t("display_desc")}
        </p>
      </div>
      <Switch
        checked={checked}
        onCheckedChange={onToggle}
        className="shrink-0 mt-0.5"
      />
    </div>
  );
}
