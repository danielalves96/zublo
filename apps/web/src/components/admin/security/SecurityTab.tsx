import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { adminService } from "@/services/admin";
import type { AdminSettings } from "@/types";

export function SecurityTab() {
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

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          {t("security")}
        </h2>
        <p className="text-muted-foreground">{t("security_desc")}</p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="grid gap-2">
          <Label className="text-sm font-medium">{t("webhook_allowlist")}</Label>
          <Textarea
            defaultValue={settings?.webhook_allowlist_csv ?? ""}
            onBlur={(e) => save.mutate({ webhook_allowlist_csv: e.target.value })}
            rows={6}
            className="bg-muted/50 font-mono text-sm resize-y rounded-xl"
            placeholder="https://hooks.example.com"
          />
          <p className="text-xs text-muted-foreground">{t("one_url_per_line")}</p>
        </div>
      </div>
    </div>
  );
}
