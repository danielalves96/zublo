import { useTranslation } from "react-i18next";

import type { SMTPFormValues } from "@/components/admin/smtp/smtp.types";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SMTPSenderSectionProps {
  form: SMTPFormValues;
  setField: <K extends keyof SMTPFormValues>(
    field: K,
    value: SMTPFormValues[K],
  ) => void;
}

export function SMTPSenderSection({
  form,
  setField,
}: SMTPSenderSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">{t("smtp_sender")}</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">
            {t("smtp_from_email")}
          </Label>
          <Input
            placeholder="noreply@example.com"
            value={form.senderAddress}
            onChange={(e) => setField("senderAddress", e.target.value)}
            className="bg-muted/50 rounded-xl"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">
            {t("smtp_from_name")}
          </Label>
          <Input
            placeholder="Zublo"
            value={form.senderName}
            onChange={(e) => setField("senderName", e.target.value)}
            className="bg-muted/50 rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
