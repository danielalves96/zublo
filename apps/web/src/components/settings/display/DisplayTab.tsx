import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { DisplayToggleCard } from "@/components/settings/display/DisplayToggleCard";
import {
  DISPLAY_TOGGLES,
  type DisplayKey,
} from "@/components/settings/display/display.config";
import { useUserSettingsMutation } from "@/components/settings/shared/useUserSettingsMutation";
import { Separator } from "@/components/ui/separator";
import { Receipt } from "lucide-react";

export function DisplayTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mut = useUserSettingsMutation();

  const toggleField = (key: DisplayKey) => {
    mut.mutate({ [key]: !user?.[key as keyof typeof user] });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">{t("display")}</h2>
        <p className="text-muted-foreground">{t("display_desc")}</p>
      </div>

      <Separator />

      <div className="space-y-3">
        {DISPLAY_TOGGLES.map(({ key, labelKey, descriptionKey }) => (
          <DisplayToggleCard
            key={key}
            checked={!!user?.[key as keyof typeof user]}
            label={t(labelKey)}
            description={t(descriptionKey)}
            onToggle={() => toggleField(key)}
          />
        ))}
      </div>

      <Separator />

      {/* Payment Tracking */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">{t("payment_tracking")}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t("payment_tracking_desc")}</p>

        <DisplayToggleCard
          checked={!!user?.payment_tracking}
          label={t("payment_tracking")}
          description={t("payment_tracking_desc")}
          onToggle={() => toggleField("payment_tracking")}
        />
      </div>
    </div>
  );
}
