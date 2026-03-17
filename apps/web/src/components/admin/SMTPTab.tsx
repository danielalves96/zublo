import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import pb from "@/lib/pb";
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
    queryKey: ["admin-smtp"],
    queryFn: async () => {
      const res = await fetch("/api/admin/smtp", {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      if (!res.ok) throw new Error("Failed to load SMTP settings");
      const data = await res.json();
      setForm({
        enabled: !!data.enabled, host: data.host || "", port: data.port || 587,
        username: data.username || "", password: "",
        tls: !!data.tls, authMethod: data.authMethod || "PLAIN",
        senderAddress: data.senderAddress || "", senderName: data.senderName || "",
      });
      setHasExistingPassword(!!data.hasPassword);
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
      const res = await fetch("/api/admin/smtp", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${pb.authStore.token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(t("saved"));
        if (form.password) setHasExistingPassword(true);
        setForm((prev) => ({ ...prev, password: "" }));
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        toast.error(err.error || t("error"));
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/smtp/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      const data = await res.json();
      if (res.ok) toast.success(data.message || t("test_sent"));
      else toast.error(data.error || t("error"));
    } catch {
      toast.error(t("error"));
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
        <p className="text-muted-foreground">{t("smtp_settings") || "Configure outbound email delivery."}</p>
      </div>

      <Separator />

      <div className="space-y-8">
        <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div>
            <Label className="font-semibold text-primary">{t("enabled")}</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("smtp_enable_description") || "Send email notifications and account emails."}
            </p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
        </div>

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t("smtp_server") || "Server"}</h3>
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
                {t("smtp_tls_description") || "Force TLS (port 465). Leave off to use STARTTLS (port 587)."}
              </p>
            </div>
            <Switch checked={form.tls} onCheckedChange={(v) => set("tls", v)} />
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t("smtp_auth") || "Authentication"}</h3>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_username")}</Label>
              <Input placeholder="user@example.com" value={form.username} onChange={(e) => set("username", e.target.value)} className="bg-muted/50 rounded-xl" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_password")}</Label>
              <Input type="password" placeholder={hasExistingPassword ? "••••••••  (unchanged)" : t("password")} value={form.password} onChange={(e) => set("password", e.target.value)} className="bg-muted/50 rounded-xl" />
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t("smtp_sender") || "Sender"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_from_email")}</Label>
              <Input placeholder="noreply@example.com" value={form.senderAddress} onChange={(e) => set("senderAddress", e.target.value)} className="bg-muted/50 rounded-xl" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_from_name") || "From name"}</Label>
              <Input placeholder="Zublo" value={form.senderName} onChange={(e) => set("senderName", e.target.value)} className="bg-muted/50 rounded-xl" />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap pt-2">
          <Button onClick={save} disabled={saving} className="rounded-xl shadow-lg shadow-primary/20">
            {saving ? t("saving") || "Saving…" : t("save")}
          </Button>
          <Button variant="outline" onClick={testEmail} disabled={testing || !form.enabled} className="rounded-xl">
            {testing ? t("sending") || "Sending…" : t("send_test_email")}
          </Button>
        </div>
      </div>
    </div>
  );
}
