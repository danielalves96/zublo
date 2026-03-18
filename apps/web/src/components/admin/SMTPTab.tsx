import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { adminService } from "@/services/admin";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Mail } from "lucide-react";

export function SMTPTab() {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState({
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

  const set = (field: string, value: unknown) =>
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
        <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div>
            <Label className="font-semibold text-primary">{t("enabled")}</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("smtp_enable_description")}
            </p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t("smtp_server")}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_address")}</Label>
              <Input placeholder="smtp.example.com" value={form.host} onChange={(e) => set("host", e.target.value)} className="bg-muted/50 rounded-xl" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_port")}</Label>
              <Input type="number" placeholder="587" value={form.port} onChange={(e) => set("port", Number(e.target.value))} className="bg-muted/50 rounded-xl" />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border bg-card hover:bg-muted/30 p-4 transition-colors">
            <div>
              <Label className="text-sm font-medium">TLS</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("smtp_tls_description")}
              </p>
            </div>
            <Switch checked={form.tls} onCheckedChange={(v) => set("tls", v)} />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t("smtp_auth")}</h3>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_username")}</Label>
              <Input placeholder="user@example.com" value={form.username} onChange={(e) => set("username", e.target.value)} className="bg-muted/50 rounded-xl" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_password")}</Label>
              <Input type="password" placeholder={hasExistingPassword ? t("smtp_password_unchanged") : t("password")} value={form.password} onChange={(e) => set("password", e.target.value)} className="bg-muted/50 rounded-xl" />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t("smtp_sender")}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_from_email")}</Label>
              <Input placeholder="noreply@example.com" value={form.senderAddress} onChange={(e) => set("senderAddress", e.target.value)} className="bg-muted/50 rounded-xl" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_from_name")}</Label>
              <Input placeholder="Zublo" value={form.senderName} onChange={(e) => set("senderName", e.target.value)} className="bg-muted/50 rounded-xl" />
            </div>
          </div>
        </div>

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
