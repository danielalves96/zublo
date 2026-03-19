import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { SMTPFormValues } from "@/components/admin/smtp/smtp.types";

interface SMTPAuthSectionProps {
  form: SMTPFormValues;
  hasExistingPassword: boolean;
  setField: <K extends keyof SMTPFormValues>(
    field: K,
    value: SMTPFormValues[K],
  ) => void;
}

export function SMTPAuthSection({
  form,
  hasExistingPassword,
  setField,
}: SMTPAuthSectionProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-lg">{t("smtp_auth")}</h3>
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">
            {t("smtp_username")}
          </Label>
          <Input
            placeholder="user@example.com"
            value={form.username}
            onChange={(e) => setField("username", e.target.value)}
            className="bg-muted/50 rounded-xl"
          />
        </div>
        <div className="grid gap-2">
          <Label className="text-xs text-muted-foreground">
            {t("smtp_password")}
          </Label>
          <Input
            type="password"
            placeholder={
              hasExistingPassword ? t("smtp_password_unchanged") : t("password")
            }
            value={form.password}
            onChange={(e) => setField("password", e.target.value)}
            className="bg-muted/50 rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
