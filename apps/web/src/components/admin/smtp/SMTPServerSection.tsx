import { useTranslation } from "react-i18next";

import type { SMTPFormValues } from "@/components/admin/smtp/smtp.types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface SMTPServerSectionProps {
  form: SMTPFormValues;
  setField: <K extends keyof SMTPFormValues>(
    field: K,
    value: SMTPFormValues[K],
  ) => void;
}

export function SMTPServerSection({
  form,
  setField,
}: SMTPServerSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">{t("smtp_server")}</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 grid gap-2">
          <Label className="text-xs text-muted-foreground">
            {t("smtp_address")}
          </Label>
          <Input
            placeholder="smtp.example.com"
            value={form.host}
            onChange={(e) => setField("host", e.target.value)}
            className="bg-muted/50 rounded-xl"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">
            {t("smtp_port")}
          </Label>
          <Input
            type="number"
            placeholder="587"
            value={form.port}
            onChange={(e) => setField("port", Number(e.target.value))}
            className="bg-muted/50 rounded-xl"
          />
        </div>
      </div>
      <div className="flex items-center justify-between rounded-2xl border bg-card hover:bg-muted/30 p-4 transition-colors">
        <div>
          <Label className="text-sm font-medium">TLS</Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("smtp_tls_description")}
          </p>
        </div>
        <Switch checked={form.tls} onCheckedChange={(value) => setField("tls", value)} />
      </div>
    </div>
  );
}
