import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OIDCSecretFieldProps {
  secretConfigured: boolean;
  secretValue: string;
  onRemove: () => void;
  onSave: (value: string) => void;
  onSecretChange: (value: string) => void;
}

export function OIDCSecretField({
  secretConfigured,
  secretValue,
  onRemove,
  onSave,
  onSecretChange,
}: OIDCSecretFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between gap-3">
        <Label className="text-sm font-medium">{t("oidc_client_secret")}</Label>
        {secretConfigured && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-destructive/70 hover:text-destructive"
            onClick={onRemove}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            {t("remove")}
          </Button>
        )}
      </div>

      <Input
        type="password"
        value={secretValue}
        onChange={(e) => onSecretChange(e.target.value)}
        onBlur={() => {
          const trimmed = secretValue.trim();
          if (!trimmed) return;
          onSave(trimmed);
        }}
        className="bg-muted/50 rounded-xl"
        placeholder={secretConfigured ? "••••••••••••••••" : undefined}
      />
    </div>
  );
}
