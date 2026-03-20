import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, Save, Trash2 } from "lucide-react";
import { useEffect,useState } from "react";
import { useTranslation } from "react-i18next";

import { AIModelSelector } from "@/components/settings/ai/AIModelSelector";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { aiService } from "@/services/ai";
import type { AISettings } from "@/types";

export function AITab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [initialized, setInitialized] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [removeStoredApiKey, setRemoveStoredApiKey] = useState(false);
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  const { data: aiSettings, isLoading } = useQuery({
    queryKey: queryKeys.aiSettings(user?.id ?? ""),
    queryFn: () => aiService.getSettings(user!.id),
    enabled: !!user?.id,
  });

  // Initialize form state from loaded settings (only once)
  useEffect(() => {
    if (aiSettings && !initialized) {
      setEnabled(aiSettings.enabled ?? false);
      setProviderName(aiSettings.name ?? "");
      setApiUrl(aiSettings.url ?? "");
      setApiKey("");
      setApiKeyConfigured(aiSettings.api_key_configured ?? false);
      setRemoveStoredApiKey(false);
      setModel(aiSettings.model ?? "");
      setInitialized(true);
    }
    if (aiSettings === null && !initialized) {
      setApiKeyConfigured(false);
      setRemoveStoredApiKey(false);
      setInitialized(true);
    }
  }, [aiSettings, initialized]);

  const canFetchModels = apiUrl.trim().length > 0;

  const fetchModels = async () => {
    if (!canFetchModels) return;
    setFetchingModels(true);
    setModels([]);
    try {
      const data = await aiService.getModels(apiUrl.trim(), apiKey.trim());
      const list: string[] = data.models ?? [];

      if (list.length === 0) {
        toast.error(t("no_models_found"));
      } else {
        setModels(list);
        // Keep selected model if still in the new list, otherwise reset
        if (model && !list.includes(model)) setModel("");
        toast.success(t("models_found", { count: list.length }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(t("failed_fetch_models", { error: msg }));
    } finally {
      setFetchingModels(false);
    }
  };

  const saveMut = useMutation({
    mutationFn: async (overrides?: Partial<{ enabled: boolean }>) => {
      const trimmedApiKey = apiKey.trim();
      const data: Partial<AISettings> = {
        enabled: overrides?.enabled ?? enabled,
        name: providerName.trim(),
        type: (providerName.trim() || "chatgpt") as AISettings["type"],
        url: apiUrl.trim(),
        model: model.trim(),
        user: user?.id,
      };

      if (removeStoredApiKey) {
        data.api_key = "";
        data.api_key_configured = false;
      } else if (trimmedApiKey) {
        data.api_key = trimmedApiKey;
        data.api_key_configured = true;
      } else if (!aiSettings?.id || !apiKeyConfigured) {
        data.api_key = "";
        data.api_key_configured = false;
      }

      if (aiSettings?.id) {
        return aiService.updateSettings(aiSettings.id, data);
      }
      return aiService.createSettings(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.aiSettings(user?.id ?? "") });
      setApiKey("");
      setRemoveStoredApiKey(false);
      if (apiKey.trim()) {
        setApiKeyConfigured(true);
      } else if (removeStoredApiKey) {
        setApiKeyConfigured(false);
      }
      toast.success(t("success_save"));
    },
    onError: () => toast.error(t("error_save")),
  });

  const handleToggleEnabled = (value: boolean) => {
    setEnabled(value);
    saveMut.mutate({ enabled: value });
  };

  if (isLoading || !initialized) {
    return <div className="h-64 rounded-3xl bg-muted/30 animate-pulse" />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary" />
            {t("ai_settings")}
          </h2>
          <p className="text-muted-foreground">
            {t("ai_settings_desc")}
          </p>
        </div>
        <div className="flex items-center gap-3 bg-muted/50 py-2 px-4 rounded-full border">
          <Switch id="ai-enable" checked={enabled} onCheckedChange={handleToggleEnabled} disabled={saveMut.isPending} />
          <Label htmlFor="ai-enable" className="font-semibold cursor-pointer">
            {enabled ? t("ai_enabled_label") : t("ai_disabled_label")}
          </Label>
        </div>
      </div>

      <Separator />

      <div
        className={`space-y-8 transition-opacity duration-300 ${
          !enabled ? "opacity-50 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="bg-gradient-to-br from-primary/10 to-transparent p-6 rounded-3xl border border-primary/20 shadow-sm">
          <div className="flex items-center gap-3 mb-6 text-primary">
            <Bot className="w-6 h-6" />
            <h3 className="text-xl font-semibold">{t("provider_configuration")}</h3>
          </div>

          <div className="space-y-6">
            {/* Provider Name */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{t("provider_name")}</Label>
              <Input
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder={t("provider_name_placeholder")}
                className="h-12 rounded-xl text-base bg-background"
              />
            </div>

            {/* API Base URL */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">{t("api_base_url")}</Label>
              <Input
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="h-12 rounded-xl text-base bg-background font-mono"
              />
              <p className="text-sm text-muted-foreground">
                {t("api_url_desc")}
              </p>
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-base font-semibold">{t("api_key")}</Label>
                {apiKeyConfigured && !removeStoredApiKey && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-destructive/70 hover:text-destructive"
                    onClick={() => {
                      setApiKey("");
                      setRemoveStoredApiKey(true);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    {t("remove")}
                  </Button>
                )}
              </div>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setRemoveStoredApiKey(false);
                }}
                placeholder={apiKeyConfigured && !removeStoredApiKey ? "••••••••••••••••" : t("api_key_placeholder")}
                className="h-12 rounded-xl text-base bg-background font-mono"
              />
              <p className="text-sm text-muted-foreground">
                {removeStoredApiKey
                  ? `${t("api_key_auth_desc")} ${t("save")}.`
                  : apiKeyConfigured
                    ? `${t("saved")}. ${t("api_key_auth_desc")}`
                    : t("api_key_auth_desc")}
              </p>
            </div>

            <AIModelSelector
              canFetchModels={canFetchModels}
              fetchingModels={fetchingModels}
              model={model}
              models={models}
              onFetchModels={fetchModels}
              onModelChange={setModel}
            />
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button
            size="lg"
            onClick={() => saveMut.mutate(undefined)}
            disabled={saveMut.isPending}
            className="rounded-xl shadow-lg shadow-primary/20 min-w-32"
          >
            <Save className="w-5 h-5 mr-2" />
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
