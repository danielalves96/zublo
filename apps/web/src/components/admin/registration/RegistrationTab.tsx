import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Settings } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { adminService } from "@/services/admin";
import type { AdminSettings } from "@/types";

export function RegistrationTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: queryKeys.admin.settings(),
    queryFn: () => adminService.getSettings(),
  });

  const save = useMutation({
    mutationFn: (data: Partial<AdminSettings>) => adminService.updateSettings(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.settings() });
      toast.success(t("saved"));
    },
  });

  const toggles: { key: keyof AdminSettings; label: string; description?: string }[] = [
    { key: "open_registrations", label: t("open_registrations"), description: t("open_registrations_desc") },
    { key: "require_email_validation", label: t("require_email_validation"), description: t("require_email_validation_desc") },
    { key: "disable_login", label: t("disable_login"), description: t("disable_login_desc") },
    { key: "update_notification", label: t("update_notifications"), description: t("update_notifications_desc") },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          {t("registration")}
        </h2>
        <p className="text-muted-foreground">{t("registration_settings")}</p>
      </div>

      <Separator />

      <div className="space-y-8">
        <div className="space-y-3">
          {toggles.map(({ key, label, description }) => (
            <div
              key={key as string}
              className="flex items-center justify-between rounded-2xl border bg-card hover:bg-muted/30 p-4 transition-colors"
            >
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{label}</Label>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
              </div>
              <Switch
                checked={!!settings?.[key]}
                onCheckedChange={(c) => save.mutate({ [key]: c } as Partial<AdminSettings>)}
              />
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t("limits_and_urls")}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-sm font-medium">{t("max_users")}</Label>
              <Input
                type="number"
                defaultValue={settings?.max_users ?? 0}
                onBlur={(e) => save.mutate({ max_users: Number(e.target.value) })}
                className="bg-muted/50 rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium">{t("server_url")}</Label>
              <Input
                defaultValue={settings?.server_url ?? ""}
                onBlur={(e) => save.mutate({ server_url: e.target.value })}
                className="bg-muted/50 rounded-xl"
                placeholder="https://app.example.com"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
