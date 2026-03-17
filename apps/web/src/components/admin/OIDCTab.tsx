import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import pb from "@/lib/pb";
import { toast } from "@/lib/toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck } from "lucide-react";
import type { AdminSettings } from "@/types";

export function OIDCTab() {
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
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${pb.authStore.token}` },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success(t("saved"));
    },
  });

  const oidcFields: { key: keyof AdminSettings; label: string; placeholder?: string }[] = [
    { key: "oidc_provider_name", label: t("provider_name"), placeholder: t("oidc_provider_placeholder") },
    { key: "oidc_client_id", label: t("oidc_client_id") },
    { key: "oidc_client_secret", label: t("oidc_client_secret") },
    { key: "oidc_issuer_url", label: t("oidc_issuer_url"), placeholder: "https://accounts.example.com" },
    { key: "oidc_redirect_url", label: t("oidc_redirect_url"), placeholder: "https://app.example.com/oidc/callback" },
    { key: "oidc_scopes", label: t("oidc_scopes"), placeholder: "openid email profile" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary" />
          OIDC / SSO
        </h2>
        <p className="text-muted-foreground">{t("oidc_desc")}</p>
      </div>

      <Separator />

      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <Label className="font-semibold text-primary">{t("enabled")}</Label>
          <Switch
            checked={!!settings?.oidc_enabled}
            onCheckedChange={(c) => save.mutate({ oidc_enabled: c })}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          {oidcFields.map(({ key, label, placeholder }) => (
            <div key={key as string} className="grid gap-2">
              <Label className="text-sm font-medium">{label}</Label>
              <Input
                defaultValue={String(settings?.[key] ?? "")}
                onBlur={(e) => save.mutate({ [key]: e.target.value } as Partial<AdminSettings>)}
                className="bg-muted/50 rounded-xl"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
