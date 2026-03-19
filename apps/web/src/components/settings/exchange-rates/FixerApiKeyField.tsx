import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ExternalLink, Trash2 } from "lucide-react";

interface FixerApiKeyFieldProps {
  apiKey: string;
  apiKeyConfigured: boolean;
  provider: "fixer" | "apilayer";
  providerLink: string;
  removeStoredApiKey: boolean;
  onApiKeyChange: (value: string) => void;
  onRemoveStoredApiKey: () => void;
}

export function FixerApiKeyField({
  apiKey,
  apiKeyConfigured,
  provider,
  providerLink,
  removeStoredApiKey,
  onApiKeyChange,
  onRemoveStoredApiKey,
}: FixerApiKeyFieldProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-medium">{t("fixer_api_key")}</label>
        {apiKeyConfigured && !removeStoredApiKey && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2 text-destructive/70 hover:text-destructive"
            onClick={onRemoveStoredApiKey}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            {t("remove")}
          </Button>
        )}
      </div>

      <Input
        type="password"
        value={apiKey}
        onChange={(e) => onApiKeyChange(e.target.value)}
        placeholder={
          apiKeyConfigured && !removeStoredApiKey
            ? "••••••••••••••••"
            : "••••••••••••••••"
        }
        className="rounded-xl"
      />

      <p className="text-xs text-muted-foreground">
        {removeStoredApiKey
          ? `${t("fixer_api_key")} ${t("remove")}. ${t("save")}.`
          : apiKeyConfigured
            ? `${t("saved")}.`
            : ""}
      </p>

      <a
        href={providerLink}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
      >
        {t("get_free_api_key")} {provider === "fixer" ? "Fixer.io" : "APILayer"}
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
