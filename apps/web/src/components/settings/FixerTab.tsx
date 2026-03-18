import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { fixerService } from "@/services/fixer";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { TrendingUp, RefreshCw, Check, ExternalLink } from "lucide-react";
import type { FixerSettings } from "@/types";

export function FixerTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [apiKey, setApiKey] = useState("");
  const [provider, setProvider] = useState<"fixer" | "apilayer">("fixer");

  const { data: settings } = useQuery({
    queryKey: ["fixer_settings", user?.id ?? ""],
    queryFn: () => fixerService.getSettings(user!.id),
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (settings) {
      setApiKey(settings.api_key || "");
      setProvider(settings.provider || "fixer");
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: () => {
      const payload: Partial<FixerSettings> = {
        api_key: apiKey,
        provider,
        enabled: !!apiKey,
        user: user!.id,
      };
      return settings?.id
        ? fixerService.updateSettings(settings.id, payload)
        : fixerService.createSettings(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fixer_settings", user?.id ?? ""] });
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

  const providerLinks: Record<string, string> = {
    fixer: "https://fixer.io/product",
    apilayer: "https://apilayer.com/marketplace/fixer-api",
  };

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

      <div className="space-y-6 max-w-md">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("fixer_provider")}</label>
          <Select value={provider} onValueChange={(v) => setProvider(v as "fixer" | "apilayer")}>
            <SelectTrigger className="rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="fixer">Fixer.io</SelectItem>
              <SelectItem value="apilayer">APILayer</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium">{t("fixer_api_key")}</label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="••••••••••••••••"
            className="rounded-xl"
          />
          <a
            href={providerLinks[provider]}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
          >
            {t("get_free_api_key")} <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <Button
            onClick={() => saveMut.mutate()}
            disabled={saveMut.isPending || !apiKey.trim()}
            className="rounded-xl"
          >
            <Check className="w-4 h-4 mr-2" />
            {saveMut.isPending ? t("loading") : t("save")}
          </Button>

          <Button
            variant="outline"
            onClick={() => updateRatesMut.mutate()}
            disabled={updateRatesMut.isPending || !settings?.api_key}
            className="rounded-xl"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${updateRatesMut.isPending ? "animate-spin" : ""}`} />
            {t("update_exchange")}
          </Button>
        </div>

        {settings?.api_key && (
          <p className="text-xs text-muted-foreground bg-muted/50 rounded-xl p-3">
            {t("fixer_configured_hint")}
          </p>
        )}
      </div>
    </div>
  );
}
