import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { FixerActions } from "@/components/settings/exchange-rates/FixerActions";
import { FixerApiKeyField } from "@/components/settings/exchange-rates/FixerApiKeyField";
import { FixerProviderSelect } from "@/components/settings/exchange-rates/FixerProviderSelect";
import { FIXER_PROVIDER_LINKS } from "@/components/settings/exchange-rates/fixer.constants";
import { fixerService } from "@/services/fixer";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { Separator } from "@/components/ui/separator";
import { TrendingUp } from "lucide-react";
import type { FixerSettings } from "@/types";

export function FixerTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [apiKey, setApiKey] = useState("");
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [removeStoredApiKey, setRemoveStoredApiKey] = useState(false);
  const [provider, setProvider] = useState<"fixer" | "apilayer">("fixer");

  const { data: settings } = useQuery({
    queryKey: ["fixer_settings", user?.id ?? ""],
    queryFn: () => fixerService.getSettings(user!.id),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (settings) {
      setApiKey("");
      setApiKeyConfigured(settings.api_key_configured ?? false);
      setRemoveStoredApiKey(false);
      setProvider(settings.provider || "fixer");
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: () => {
      const trimmedApiKey = apiKey.trim();
      const hasEffectiveApiKey =
        !removeStoredApiKey && (trimmedApiKey.length > 0 || apiKeyConfigured);

      const payload: Partial<FixerSettings> = {
        provider,
        enabled: hasEffectiveApiKey,
        user: user!.id,
      };

      if (removeStoredApiKey) {
        payload.api_key = "";
        payload.api_key_configured = false;
      } else if (trimmedApiKey) {
        payload.api_key = trimmedApiKey;
        payload.api_key_configured = true;
      } else if (!settings?.id || !apiKeyConfigured) {
        payload.api_key = "";
        payload.api_key_configured = false;
      }

      return settings?.id
        ? fixerService.updateSettings(settings.id, payload)
        : fixerService.createSettings(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fixer_settings", user?.id ?? ""] });
      setApiKey("");
      setRemoveStoredApiKey(false);
      if (apiKey.trim()) {
        setApiKeyConfigured(true);
      } else if (removeStoredApiKey) {
        setApiKeyConfigured(false);
      }
      toast.success(t("success_update"));
    },
    onError: () => toast.error(t("error")),
  });

  const updateRatesMut = useMutation({
    mutationFn: () => fixerService.updateRates(),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.currencies.all(user?.id ?? "") });
      toast.success(t("update_exchange") + ` (${data.updated})`);
    },
    onError: (err: Error) => toast.error(err.message || t("error")),
  });

  const canSave = removeStoredApiKey || apiKey.trim().length > 0 || apiKeyConfigured;
  const canUpdateRates =
    !removeStoredApiKey && (apiKeyConfigured || apiKey.trim().length > 0);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <TrendingUp className="w-8 h-8 text-primary" />
          {t("fixer_api")}
        </h2>
        <p className="text-muted-foreground">{t("convert_currency_desc")}</p>
      </div>

      <Separator />

      <div className="space-y-6 ">
        <FixerProviderSelect provider={provider} onProviderChange={setProvider} />

        <FixerApiKeyField
          apiKey={apiKey}
          apiKeyConfigured={apiKeyConfigured}
          provider={provider}
          providerLink={FIXER_PROVIDER_LINKS[provider]}
          removeStoredApiKey={removeStoredApiKey}
          onApiKeyChange={(value) => {
            setApiKey(value);
            setRemoveStoredApiKey(false);
          }}
          onRemoveStoredApiKey={() => {
            setApiKey("");
            setRemoveStoredApiKey(true);
          }}
        />

        <FixerActions
          canSave={canSave}
          canUpdateRates={canUpdateRates}
          saving={saveMut.isPending}
          updatingRates={updateRatesMut.isPending}
          onSave={() => saveMut.mutate()}
          onUpdateRates={() => updateRatesMut.mutate()}
        />

        {apiKeyConfigured && !removeStoredApiKey && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
            {t("fixer_configured_hint")}
          </p>
        )}
      </div>
    </div>
  );
}
