import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { COLOR_PRESETS } from "@/lib/color-presets";

interface AccentColorSelectorProps {
  activeColor: string;
  onSelect: (value: string) => void;
}

export function AccentColorSelector({
  activeColor,
  onSelect,
}: AccentColorSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-semibold">{t("accent_color")}</Label>
        <p className="text-sm text-muted-foreground mt-1">
          {t("accent_color_desc")}
        </p>
      </div>

      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-y-4 gap-x-2 justify-items-center">
        {COLOR_PRESETS.map((preset) => {
          const isActive = activeColor === preset.id;

          return (
            <button
              key={preset.id}
              type="button"
              title={preset.label}
              onClick={() => onSelect(preset.id)}
              className="flex flex-col items-center gap-1.5 group w-full"
            >
              <span
                className="h-9 w-9 rounded-full flex items-center justify-center transition-transform duration-150 group-hover:scale-110 mx-auto"
                style={{
                  backgroundColor: preset.hex,
                  outline: isActive
                    ? `3px solid ${preset.hex}`
                    : "3px solid transparent",
                  outlineOffset: "3px",
                }}
              >
                {isActive && (
                  <Check
                    className="w-4 h-4 text-white drop-shadow-sm"
                    strokeWidth={3}
                  />
                )}
              </span>
              <span
                className="text-[10px] font-medium leading-tight text-center transition-colors truncate w-full"
                style={{
                  color: isActive ? preset.hex : "hsl(var(--muted-foreground))",
                }}
              >
                {preset.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
