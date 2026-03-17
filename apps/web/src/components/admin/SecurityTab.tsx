import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import pb from "@/lib/pb";
import { toast } from "@/lib/toast";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Shield } from "lucide-react";
import type { AdminSettings } from "@/types";

export function SecurityTab() {
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
