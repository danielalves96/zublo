import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Check, RefreshCw } from "lucide-react";

interface FixerActionsProps {
  canSave: boolean;
  canUpdateRates: boolean;
  saving: boolean;
  updatingRates: boolean;
  onSave: () => void;
  onUpdateRates: () => void;
}

export function FixerActions({
  canSave,
  canUpdateRates,
  saving,
  updatingRates,
  onSave,
  onUpdateRates,
}: FixerActionsProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap gap-3 pt-2">
      <Button
        onClick={onSave}
        disabled={saving || !canSave}
        className="rounded-xl"
      >
        <Check className="w-4 h-4 mr-2" />
        {saving ? t("loading") : t("save")}
      </Button>

      <Button
        variant="outline"
        onClick={onUpdateRates}
        disabled={updatingRates || !canUpdateRates}
        className="rounded-xl"
      >
        <RefreshCw
          className={`w-4 h-4 mr-2 ${updatingRates ? "animate-spin" : ""}`}
        />
        {t("update_exchange")}
      </Button>
    </div>
  );
}
