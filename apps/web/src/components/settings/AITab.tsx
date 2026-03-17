import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import pb from "@/lib/pb";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Bot, Save, Sparkles, RefreshCw } from "lucide-react";

export function AITab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [initialized, setInitialized] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [fetchingModels, setFetchingModels] = useState(false);

  const { data: aiSettings, isLoading } = useQuery({
    queryKey: ["ai_settings", user?.id],
    queryFn: async () => {
      try {
        const records = await pb.collection("ai_settings").getList(1, 1, {
          filter: `user="${user?.id}"`,
        });
        return records.items[0] ?? null;
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
  });

  // Initialize form state from loaded settings (only once)
  useEffect(() => {
    if (aiSettings && !initialized) {
      setEnabled(aiSettings.enabled ?? false);
      setProviderName(aiSettings.name ?? "");
      setApiUrl(aiSettings.url ?? "");
      setApiKey(aiSettings.api_key ?? "");
      setModel(aiSettings.model ?? "");
      setInitialized(true);
    }
    if (aiSettings === null && !initialized) {
      setInitialized(true);
    }
  }, [aiSettings, initialized]);

  const canFetchModels = apiUrl.trim().length > 0;

  const fetchModels = async () => {
    if (!canFetchModels) return;
    setFetchingModels(true);
    setModels([]);
    try {
      const params = new URLSearchParams({ url: apiUrl.trim() });
      if (apiKey.trim()) params.set("api_key", apiKey.trim());

      const res = await fetch(`/api/ai/models?${params.toString()}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error ?? res.statusText);
      }
      const data = await res.json();
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
      const data = {
        enabled: overrides?.enabled ?? enabled,
        name: providerName.trim(),
        type: providerName.trim() || "custom",
        url: apiUrl.trim(),
        api_key: apiKey.trim(),
        model: model.trim(),
        user: user?.id,
      };
      if (aiSettings?.id) {
        return pb.collection("ai_settings").update(aiSettings.id, data);
      }
      return pb.collection("ai_settings").create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_settings"] });
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
            <Sparkles className="w-6 h-6" />
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
              <Label className="text-base font-semibold">{t("api_key")}</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={t("api_key_placeholder")}
                className="h-12 rounded-xl text-base bg-background font-mono"
              />
              <p className="text-sm text-muted-foreground">
                {t("api_key_auth_desc")}
              </p>
            </div>

            {/* Model selector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">{t("model")}</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg gap-2"
                  disabled={!canFetchModels || fetchingModels}
                  onClick={fetchModels}
                >
                  <RefreshCw className={`w-4 h-4 ${fetchingModels ? "animate-spin" : ""}`} />
                  {fetchingModels ? t("fetching_models") : t("fetch_models")}
                </Button>
              </div>

              {models.length > 0 ? (
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger className="h-12 rounded-xl text-base bg-background">
                    <SelectValue placeholder={t("select_model")} />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((m) => (
                      <SelectItem key={m} value={m}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={t("fetch_models_placeholder")}
                  className="h-12 rounded-xl text-base bg-background"
                />
              )}

              {models.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  {t("fetch_models_hint")}
                </p>
              )}
            </div>
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
