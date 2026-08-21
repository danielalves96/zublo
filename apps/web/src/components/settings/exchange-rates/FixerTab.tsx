import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TrendingUp } from "lucide-react";
import { useEffect,useState } from "react";
import { useTranslation } from "react-i18next";

import { FIXER_PROVIDER_LINKS } from "@/components/settings/exchange-rates/fixer.constants";
import { FixerActions } from "@/components/settings/exchange-rates/FixerActions";
import { FixerApiKeyField } from "@/components/settings/exchange-rates/FixerApiKeyField";
import { FixerProviderSelect } from "@/components/settings/exchange-rates/FixerProviderSelect";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { fixerService } from "@/services/fixer";
import type { FixerSettings } from "@/types";

export function FixerTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [apiKey, setApiKey] = useState("");
  const [removeStoredApiKey, setRemoveStoredApiKey] = useState(false);
  const [provider, setProvider] = useState<"fixer" | "apilayer">("fixer");

  const { data: settings } = useQuery({
    queryKey: ["fixer_settings", user?.id ?? ""],
    queryFn: () => fixerService.getSettings(user!.id),
    enabled: !!user?.id,
  });

  // Derived state: is there a key saved on the server?
  const isKeySavedOnServer = settings?.api_key_configured ?? false;

  useEffect(() => {
    if (settings) {
      setApiKey("");
      setRemoveStoredApiKey(false);
      setProvider(settings.provider || "fixer");
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: () => {
      const trimmedApiKey = apiKey.trim();
      const hasEffectiveApiKey =
        !removeStoredApiKey && (trimmedApiKey.length > 0 || isKeySavedOnServer);

      const payload: Partial<FixerSettings> = {
        provider,
        enabled: hasEffectiveApiKey,
        user: user!.id,
      };

      // API Key Logic:
      // 1. Explicitly requested removal
      if (removeStoredApiKey) {
        payload.api_key = "";
        payload.api_key_configured = false;
      }
      // 2. User typed a new key
      else if (trimmedApiKey) {
        payload.api_key = trimmedApiKey;
        payload.api_key_configured = true;
      }
      // 3. Updating an existing record where no key is currently saved
      else if (!isKeySavedOnServer) {
        payload.api_key = "";
        payload.api_key_configured = false;
      }
      // 4. Otherwise (isKeySavedOnServer === true and trimmedApiKey is empty):
      //    Do NOT include api_key in 'payload' so the server keeps the existing value.

      return settings?.id
        ? fixerService.updateSettings(settings.id, payload)
        : fixerService.createSettings(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fixer_settings", user?.id ?? ""] });
      setApiKey("");
      setRemoveStoredApiKey(false);
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

  const canSave = removeStoredApiKey || apiKey.trim().length > 0 || isKeySavedOnServer;
  const canUpdateRates =
    !removeStoredApiKey && (isKeySavedOnServer || apiKey.trim().length > 0);

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
          apiKeyConfigured={isKeySavedOnServer}
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

        {isKeySavedOnServer && !removeStoredApiKey && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
            {t("fixer_configured_hint")}
          </p>
        )}
      </div>
    </div>
  );
}
