import { useState } from "react";
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
import { Bot, Save, Sparkles } from "lucide-react";

export function AITab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: aiSettings, isLoading } = useQuery({
    queryKey: ["ai_settings", user?.id],
    queryFn: async () => {
      try {
        const records = await pb.collection("ai_settings").getList(1, 1, { filter: `user="${user?.id}"` });
        return records.items[0];
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
  });

  const [enabled, setEnabled] = useState(false);
  const [provider, setProvider] = useState("openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");

  // Initialize form when data loads
  if (aiSettings && !apiKey && aiSettings.api_key) {
    setEnabled(aiSettings.enabled);
    setProvider(aiSettings.provider || "openai");
    setApiKey(aiSettings.api_key);
    setModel(aiSettings.model || "");
  }

  const saveMut = useMutation({
    mutationFn: async () => {
      const data = {
        enabled,
        provider,
        api_key: apiKey,
        model,
        user: user?.id,
      };
      if (aiSettings?.id) {
        return pb.collection("ai_settings").update(aiSettings.id, data);
      } else {
        return pb.collection("ai_settings").create(data);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ai_settings"] });
      toast.success(t("success_save"));
    },
    onError: () => toast.error(t("error_save")),
  });

  const handleSave = () => saveMut.mutate();

  if (isLoading) {
    return <div className="h-64 rounded-3xl bg-muted/30 animate-pulse" />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Bot className="w-8 h-8 text-primary" />
            AI Settings
          </h2>
          <p className="text-muted-foreground">Configure artificial intelligence integrations to categorize your subscriptions automatically.</p>
        </div>
        <div className="flex items-center gap-3 bg-muted/50 py-2 px-4 rounded-full border">
          <Switch id="ai-enable" checked={enabled} onCheckedChange={setEnabled} />
          <Label htmlFor="ai-enable" className="font-semibold cursor-pointer">
            {enabled ? "AI Enabled" : "AI Disabled"}
          </Label>
        </div>
      </div>

      <Separator />

      <div className={`space-y-8 transition-opacity duration-300 ${!enabled ? "opacity-50 pointer-events-none" : "opacity-100"}`}>
        <div className="bg-gradient-to-br from-primary/10 to-transparent p-6 rounded-3xl border border-primary/20 shadow-sm">
          <div className="flex items-center gap-3 mb-6 text-primary">
            <Sparkles className="w-6 h-6" />
            <h3 className="text-xl font-semibold">AI Provider Configuration</h3>
          </div>

          <div className="space-y-6">
            <div className="space-y-3">
              <Label className="text-base font-semibold">Provider</Label>
              <Select value={provider} onValueChange={setProvider}>
                <SelectTrigger className="h-12 rounded-xl text-base bg-background">
                  <SelectValue placeholder="Select an AI Provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                  <SelectItem value="anthropic">Anthropic (Claude)</SelectItem>
                  <SelectItem value="gemini">Google Gemini</SelectItem>
                  <SelectItem value="ollama">Local (Ollama)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">API Key</Label>
              <Input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={`Enter your ${provider === "openai" ? "OpenAI" : "API"} key...`}
                className="h-12 rounded-xl text-base bg-background font-mono"
              />
              <p className="text-sm text-muted-foreground">
                Your key is stored securely and only used to interact with the chosen provider to categorize and analyze subscriptions.
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Custom Model Name (Optional)</Label>
              <Input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. gpt-4o, claude-3-opus-20240229..."
                className="h-12 rounded-xl text-base bg-background"
              />
              <p className="text-sm text-muted-foreground">Leave empty to use the default recommended model for this provider.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <Button size="lg" onClick={handleSave} disabled={saveMut.isPending} className="rounded-xl shadow-lg shadow-primary/20 min-w-32">
            <Save className="w-5 h-5 mr-2" />
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
