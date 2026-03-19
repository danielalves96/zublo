import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FlaskConical } from "lucide-react";
import type { ProviderConfig } from "@/components/settings/notifications/config";
import type { NotificationsConfig } from "@/types";

interface ProviderCardProps {
  provider: ProviderConfig;
  formData: Partial<NotificationsConfig>;
  onChange: (key: keyof NotificationsConfig, value: unknown) => void;
  onTest: () => void;
  isTesting: boolean;
}

export function ProviderCard({
  provider,
  formData,
  onChange,
  onTest,
  isTesting,
}: ProviderCardProps) {
  const { t } = useTranslation();
  const isEnabled = !!formData[provider.enabledKey];
  const Icon = provider.icon;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isEnabled
          ? `bg-card shadow-sm ${provider.borderClass}`
          : "bg-muted/20 border-border/50"
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className={`p-2 rounded-xl shrink-0 transition-colors ${
            isEnabled
              ? `${provider.bgClass} ${provider.colorClass}`
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={`font-medium text-sm leading-none ${
              isEnabled ? "" : "text-muted-foreground"
            }`}
          >
            {provider.label}
          </p>
          {isEnabled && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">
              {t(provider.descriptionKey, provider.label)}
            </p>
          )}
        </div>
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => onChange(provider.enabledKey, checked)}
        />
      </div>

      <div
        className={`transition-all duration-200 ${
          isEnabled ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        } overflow-hidden`}
      >
        <div className="px-4 pb-4 space-y-3 border-t border-inherit pt-3">
          <div
            className={`grid gap-3 ${
              provider.fields.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
            }`}
          >
            {provider.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs">
                  {t(field.labelKey, field.labelKey)}
                </Label>
                <Input
                  type={field.type}
                  value={(formData[field.key] as string) || ""}
                  onChange={(e) => onChange(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  className="bg-background h-9 rounded-xl text-sm"
                />
              </div>
            ))}
          </div>

          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onTest}
              disabled={isTesting}
              className="h-8 rounded-xl gap-1.5 text-xs"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              {isTesting
                ? t("sending", "Sending…")
                : t("test_notification", "Test")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
