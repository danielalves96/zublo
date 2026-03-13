import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import pb from "@/lib/pb";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Sun, Moon, Monitor } from "lucide-react";

function useUserMutation() {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pb.collection("users").update(user!.id, data),
    onSuccess: () => {
      refreshUser();
      qc.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function ThemeTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mut = useUserMutation();

  const themes = [
    { value: 0, label: t("light"), icon: Sun },
    { value: 1, label: t("dark"), icon: Moon },
    { value: 2, label: t("system"), icon: Monitor },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">{t("theme")}</h2>
        <p className="text-muted-foreground">Choose how the app looks. You can also add custom CSS styles.</p>
      </div>

      <Separator />

      <div className="space-y-8">
        <div className="space-y-3">
          <Label className="text-base font-semibold">Color Scheme</Label>
          <p className="text-sm text-muted-foreground">Select your preferred color scheme.</p>
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

        <div className="space-y-3">
          <Label className="text-base font-semibold">{t("custom_css")}</Label>
          <p className="text-sm text-muted-foreground">
            Add custom CSS to further personalize the appearance. Changes apply on save (blur).
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
