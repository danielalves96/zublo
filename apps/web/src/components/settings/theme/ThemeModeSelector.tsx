import { useTranslation } from "react-i18next";

import { THEME_MODES } from "@/components/settings/theme/theme.config";
import { Label } from "@/components/ui/label";

interface ThemeModeSelectorProps {
  activeMode?: number;
  onSelect: (value: number) => void;
}

export function ThemeModeSelector({
  activeMode,
  onSelect,
}: ThemeModeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">{t("color_scheme")}</Label>
      <p className="text-sm text-muted-foreground">{t("color_scheme_desc")}</p>
      <div className="grid grid-cols-3 gap-3">
        {THEME_MODES.map((mode) => {
          const Icon = mode.icon;
          const isActive = activeMode === mode.value;

          return (
            <button
              key={mode.value}
              type="button"
              onClick={() => onSelect(mode.value)}
              className={`flex flex-col items-center gap-3 p-4 rounded-2xl border text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                  : "bg-muted/50 hover:bg-muted hover:border-primary/30"
              }`}
            >
              <Icon className="w-6 h-6" />
              {t(mode.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
