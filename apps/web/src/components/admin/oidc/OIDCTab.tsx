import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { OIDC_FIELDS } from "@/components/admin/oidc/oidc.config";
import { OIDCSecretField } from "@/components/admin/oidc/OIDCSecretField";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { adminService } from "@/services/admin";
import type { AdminSettings } from "@/types";

export function OIDCTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [secretValue, setSecretValue] = useState("");
  const [secretConfigured, setSecretConfigured] = useState(false);

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

  useEffect(() => {
    setSecretValue("");
    setSecretConfigured(!!settings?.oidc_client_secret_configured);
  }, [settings?.id, settings?.oidc_client_secret_configured]);

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
          <OIDCSecretField
            secretConfigured={secretConfigured}
            secretValue={secretValue}
            onSecretChange={setSecretValue}
            onRemove={() =>
              save.mutate({
                oidc_client_secret: "",
                oidc_client_secret_configured: false,
              })
            }
            onSave={(value) =>
              save.mutate({
                oidc_client_secret: value,
                oidc_client_secret_configured: true,
              })
            }
          />
          {OIDC_FIELDS.map(({ key, labelKey, placeholder }) => (
            <div key={key as string} className="grid gap-2">
              <Label className="text-sm font-medium">{t(labelKey)}</Label>
              <Input
                defaultValue={String(settings?.[key] ?? "")}
                onBlur={(e) => save.mutate({ [key]: e.target.value } as Partial<AdminSettings>)}
                className="bg-muted/50 rounded-xl"
                placeholder={placeholder?.startsWith("http") ? placeholder : placeholder ? t(placeholder) : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
