import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { AccentColorSelector } from "@/components/settings/theme/AccentColorSelector";
import { ThemeModeSelector } from "@/components/settings/theme/ThemeModeSelector";
import { useUserSettingsMutation } from "@/components/settings/shared/useUserSettingsMutation";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  DEFAULT_COLOR,
  buildColorCSS,
  getPreset,
  saveColorToStorage,
} from "@/lib/color-presets";
import { LS_KEYS } from "@/lib/constants";

export function ThemeTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mut = useUserSettingsMutation();

  // Optimistic: use user's saved color, fallback to localStorage, fallback to default
  const [activeColor, setActiveColor] = useState<string>(
    user?.color_theme ?? localStorage.getItem(LS_KEYS.COLOR_THEME) ?? DEFAULT_COLOR
  );

  function applyColor(id: string) {
    setActiveColor(id);
    saveColorToStorage(id);
    // Immediately update the CSS so the whole app reflects the change
    let el = document.getElementById("color-theme") as HTMLStyleElement | null;
    if (!el) {
      el = document.createElement("style");
      el.id = "color-theme";
      document.head.appendChild(el);
    }
    el.textContent = buildColorCSS(getPreset(id));
    mut.mutate({ color_theme: id });
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">{t("theme")}</h2>
        <p className="text-muted-foreground">{t("theme_desc")}</p>
      </div>

      <Separator />

      <div className="space-y-8">
        <ThemeModeSelector
          activeMode={user?.dark_theme_mode}
          onSelect={(value) => mut.mutate({ dark_theme_mode: value })}
        />

        <Separator />

        <AccentColorSelector activeColor={activeColor} onSelect={applyColor} />

        <Separator />

        {/* Custom CSS */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">{t("custom_css")}</Label>
          <p className="text-sm text-muted-foreground">
            {t("custom_css_desc")}
          </p>
          <Textarea
            rows={10}
            defaultValue={user?.custom_css ?? ""}
            onBlur={(e) => mut.mutate({ custom_css: e.target.value })}
            placeholder={`/* custom styles */\n\n.my-element {\n  color: red;\n}`}
            className="font-mono text-sm bg-[#1e1e1e] text-[#d4d4d4] rounded-2xl border-border/50 resize-y"
          />
        </div>
      </div>
    </div>
  );
}
