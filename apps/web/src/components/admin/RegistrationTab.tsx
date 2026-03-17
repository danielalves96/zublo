import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import pb from "@/lib/pb";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings } from "lucide-react";
import type { AdminSettings } from "@/types";

export function RegistrationTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      if (!res.ok) return null;
      return res.json() as Promise<AdminSettings | null>;
    },
  });

  const save = useMutation({
    mutationFn: (data: Partial<AdminSettings>) =>
      fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success(t("saved"));
    },
  });

  const toggles: { key: keyof AdminSettings; label: string; description?: string }[] = [
    { key: "open_registrations", label: t("open_registrations"), description: "Allow new users to self-register." },
    { key: "require_email_validation", label: t("require_email_validation"), description: "Require email verification before login." },
    { key: "disable_login", label: t("disable_login"), description: "Disable all logins (lockdown mode)." },
    { key: "update_notification", label: t("update_notifications"), description: "Notify admin about new app versions." },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          {t("registration")}
        </h2>
        <p className="text-muted-foreground">{t("registration_settings") || "Manage registration flow and server options."}</p>
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
          <h3 className="font-semibold text-lg">Limits &amp; URLs</h3>
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
