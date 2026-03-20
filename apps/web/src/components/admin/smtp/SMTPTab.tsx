import { useQuery } from "@tanstack/react-query";
import { Mail } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { SMTPFormValues } from "@/components/admin/smtp/smtp.types";
import { SMTPAuthSection } from "@/components/admin/smtp/SMTPAuthSection";
import { SMTPSenderSection } from "@/components/admin/smtp/SMTPSenderSection";
import { SMTPServerSection } from "@/components/admin/smtp/SMTPServerSection";
import { SMTPStatusCard } from "@/components/admin/smtp/SMTPStatusCard";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { adminService } from "@/services/admin";

export function SMTPTab() {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState<SMTPFormValues>({
    enabled: false, host: "", port: 587, username: "", password: "",
    tls: false, authMethod: "PLAIN", senderAddress: "", senderName: "",
  });
  const [hasExistingPassword, setHasExistingPassword] = useState(false);

  useQuery({
    queryKey: queryKeys.admin.smtp(),
    queryFn: async () => {
      const data = await adminService.getSmtp();
      setForm({
        enabled: !!data.enabled, host: (data.host as string) || "", port: (data.port as number) || 587,
        username: (data.username as string) || "", password: "",
        tls: !!data.tls, authMethod: (data.authMethod as string) || "PLAIN",
        senderAddress: (data.senderAddress as string) || "", senderName: (data.senderName as string) || "",
      });
      setHasExistingPassword(!!(data as Record<string, unknown>).hasPassword);
      return data;
    },
  });

  const set = <K extends keyof SMTPFormValues>(field: K, value: SMTPFormValues[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...form };
      if (!form.password) delete body.password;
      await adminService.updateSmtp(body);
      toast.success(t("saved"));
      if (form.password) setHasExistingPassword(true);
      setForm((prev) => ({ ...prev, password: "" }));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("error"));
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    setTesting(true);
    try {
      await adminService.testSmtp();
      toast.success(t("test_sent"));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("error"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Mail className="w-8 h-8 text-primary" />
          SMTP
        </h2>
        <p className="text-muted-foreground">{t("smtp_description")}</p>
      </div>

      <Separator />

      <div className="space-y-8">
        <SMTPStatusCard
          enabled={form.enabled}
          onEnabledChange={(value) => set("enabled", value)}
        />

        <SMTPServerSection form={form} setField={set} />

        <Separator />

        <SMTPAuthSection
          form={form}
          hasExistingPassword={hasExistingPassword}
          setField={set}
        />

        <Separator />

        <SMTPSenderSection form={form} setField={set} />

        <div className="flex items-center gap-3 flex-wrap pt-2">
          <Button onClick={save} disabled={saving} className="rounded-xl shadow-lg shadow-primary/20">
            {saving ? t("saving") : t("save")}
          </Button>
          <Button variant="outline" onClick={testEmail} disabled={testing || !form.enabled} className="rounded-xl">
            {testing ? t("sending") : t("send_test_email")}
          </Button>
        </div>
      </div>
    </div>
  );
}
