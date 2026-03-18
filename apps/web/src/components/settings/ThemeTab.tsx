import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usersService } from "@/services/users";
import { queryKeys } from "@/lib/queryKeys";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Sun, Moon, Monitor, Check } from "lucide-react";
import { COLOR_PRESETS, DEFAULT_COLOR, buildColorCSS, getPreset, saveColorToStorage } from "@/lib/color-presets";
import { LS_KEYS } from "@/lib/constants";

function useUserMutation() {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => usersService.update(user!.id, data),
    onSuccess: () => {
      refreshUser();
      qc.invalidateQueries({ queryKey: queryKeys.user() });
    },
  });
}

export function ThemeTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mut = useUserMutation();

  // Optimistic: use user's saved color, fallback to localStorage, fallback to default
  const [activeColor, setActiveColor] = useState<string>(
    user?.color_theme ?? localStorage.getItem(LS_KEYS.COLOR_THEME) ?? DEFAULT_COLOR
  );

  const themes = [
    { value: 0, label: t("light"), icon: Sun },
    { value: 1, label: t("dark"), icon: Moon },
    { value: 2, label: t("auto"), icon: Monitor },
  ];

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
        {/* Dark / Light / System */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">{t("color_scheme")}</Label>
          <p className="text-sm text-muted-foreground">{t("color_scheme_desc")}</p>
          <div className="grid grid-cols-3 gap-3">
            {themes.map((th) => {
              const Icon = th.icon;
              const isActive = user?.dark_theme_mode === th.value;
              return (
                <button
                  key={th.value}
                  onClick={() => mut.mutate({ dark_theme_mode: th.value })}
                  className={`flex flex-col items-center gap-3 p-4 rounded-2xl border text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25"
                      : "bg-muted/50 hover:bg-muted hover:border-primary/30"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                  {th.label}
                </button>
              );
            })}
          </div>
        </div>

        <Separator />

        {/* Accent Color */}
        <div className="space-y-4">
          <div>
            <Label className="text-base font-semibold">{t("accent_color")}</Label>
            <p className="text-sm text-muted-foreground mt-1">{t("accent_color_desc")}</p>
          </div>
          <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-12 gap-y-4 gap-x-2 justify-items-center">
            {COLOR_PRESETS.map((preset) => {
              const isActive = activeColor === preset.id;
              return (
                <button
                  key={preset.id}
                  title={preset.label}
                  onClick={() => applyColor(preset.id)}
                  className="flex flex-col items-center gap-1.5 group w-full"
                >
                  <span
                    className="h-9 w-9 rounded-full flex items-center justify-center transition-transform duration-150 group-hover:scale-110 mx-auto"
                    style={{
                      backgroundColor: preset.hex,
                      outline: isActive ? `3px solid ${preset.hex}` : "3px solid transparent",
                      outlineOffset: "3px",
                    }}
                  >
                    {isActive && (
                      <Check className="w-4 h-4 text-white drop-shadow-sm" strokeWidth={3} />
                    )}
                  </span>
                  <span
                    className="text-[10px] font-medium leading-tight text-center transition-colors truncate w-full"
                    style={{ color: isActive ? preset.hex : "hsl(var(--muted-foreground))" }}
                  >
                    {preset.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

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
