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
import { Switch } from "@/components/ui/switch";
import { Bell, Save, Mail, MessageSquare, Send, Radio, Link as LinkIcon, MessageCircle, Rss } from "lucide-react";
import type { NotificationsConfig } from "@/types";

type ProviderConfig = {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  fields: {
    key: keyof NotificationsConfig;
    label: string;
    type: "text" | "number" | "password" | "email";
    placeholder?: string;
  }[];
  enabledKey: keyof NotificationsConfig;
  daysKey: keyof NotificationsConfig;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: "email",
    label: "Email",
    description: "Receive reminders straight to your inbox.",
    icon: Mail,
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-primary/20",
    enabledKey: "email_enabled",
    daysKey: "email_days_before",
    fields: [
      { key: "email_to", label: "Destination Email Address", type: "email", placeholder: "you@domain.com" }
    ]
  },
  {
    id: "discord",
    label: "Discord",
    description: "Get alerted in a specific Discord channel.",
    icon: MessageSquare,
    colorClass: "text-[#5865F2]",
    bgClass: "bg-[#5865F2]/10",
    borderClass: "border-[#5865F2]/20",
    enabledKey: "discord_enabled",
    daysKey: "discord_days_before",
    fields: [
      { key: "discord_webhook_url", label: "Webhook URL", type: "text", placeholder: "https://discord.com/api/webhooks/..." }
    ]
  },
  {
    id: "telegram",
    label: "Telegram",
    description: "Get alerts from a Telegram bot.",
    icon: Send,
    colorClass: "text-[#0088cc]",
    bgClass: "bg-[#0088cc]/10",
    borderClass: "border-[#0088cc]/20",
    enabledKey: "telegram_enabled",
    daysKey: "telegram_days_before",
    fields: [
      { key: "telegram_bot_token", label: "Bot Token", type: "password", placeholder: "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" },
      { key: "telegram_chat_id", label: "Chat ID", type: "text", placeholder: "123456789" }
    ]
  },
  {
    id: "gotify",
    label: "Gotify",
    description: "Send push notifications to your Gotify server.",
    icon: Radio,
    colorClass: "text-[#1660A9]",
    bgClass: "bg-[#1660A9]/10",
    borderClass: "border-[#1660A9]/20",
    enabledKey: "gotify_enabled",
    daysKey: "gotify_days_before",
    fields: [
      { key: "gotify_url", label: "Gotify Server URL", type: "text", placeholder: "https://gotify.example.com" },
      { key: "gotify_token", label: "App Token", type: "password", placeholder: "AxxxxxxXxxxxxxx" }
    ]
  },
  {
    id: "pushover",
    label: "Pushover",
    description: "Send alerts via Pushover service.",
    icon: Rss,
    colorClass: "text-[#3DB6EE]",
    bgClass: "bg-[#3DB6EE]/10",
    borderClass: "border-[#3DB6EE]/20",
    enabledKey: "pushover_enabled",
    daysKey: "pushover_days_before",
    fields: [
      { key: "pushover_user_key", label: "User Key", type: "password" },
      { key: "pushover_api_token", label: "API Token/Key", type: "password" }
    ]
  },
  {
    id: "ntfy",
    label: "ntfy.sh",
    description: "Send push notifications to your ntfy topic.",
    icon: Bell,
    colorClass: "text-[#31b88e]",
    bgClass: "bg-[#31b88e]/10",
    borderClass: "border-[#31b88e]/20",
    enabledKey: "ntfy_enabled",
    daysKey: "ntfy_days_before",
    fields: [
      { key: "ntfy_url", label: "Server URL", type: "text", placeholder: "https://ntfy.sh" },
      { key: "ntfy_topic", label: "Topic Name", type: "text", placeholder: "mytopic" }
    ]
  },
  {
    id: "pushplus",
    label: "Pushplus",
    description: "Receive notifications via Pushplus WeChat service.",
    icon: MessageCircle,
    colorClass: "text-[#ea4c89]",
    bgClass: "bg-[#ea4c89]/10",
    borderClass: "border-[#ea4c89]/20",
    enabledKey: "pushplus_enabled",
    daysKey: "pushplus_days_before",
    fields: [
      { key: "pushplus_token", label: "Token", type: "password" }
    ]
  },
  {
    id: "mattermost",
    label: "Mattermost",
    description: "Send alerts to a Mattermost channel via webhook.",
    icon: MessageSquare,
    colorClass: "text-[#0058CC]",
    bgClass: "bg-[#0058CC]/10",
    borderClass: "border-[#0058CC]/20",
    enabledKey: "mattermost_enabled",
    daysKey: "mattermost_days_before",
    fields: [
      { key: "mattermost_webhook_url", label: "Webhook URL", type: "text" }
    ]
  },
  {
    id: "serverchan",
    label: "ServerChan",
    description: "Send messages via ServerChan (SendKey).",
    icon: Send,
    colorClass: "text-[#54b324]",
    bgClass: "bg-[#54b324]/10",
    borderClass: "border-[#54b324]/20",
    enabledKey: "serverchan_enabled",
    daysKey: "serverchan_days_before",
    fields: [
      { key: "serverchan_send_key", label: "SendKey", type: "password" }
    ]
  },
  {
    id: "webhook",
    label: "Custom Webhook",
    description: "Trigger a custom HTTP webhook.",
    icon: LinkIcon,
    colorClass: "text-accent",
    bgClass: "bg-accent/10",
    borderClass: "border-accent/20",
    enabledKey: "webhook_enabled",
    daysKey: "webhook_days_before",
    fields: [
      { key: "webhook_url", label: "Webhook URL", type: "text", placeholder: "https://api.example.com/webhook" }
    ]
  }
];

export function NotificationsTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      try {
        const records = await pb.collection("notifications").getList<NotificationsConfig>(1, 1, { filter: `user="${user?.id}"` });
        return records.items[0];
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
  });

  const [formData, setFormData] = useState<Partial<NotificationsConfig>>({});

  useEffect(() => {
    if (config) {
      setFormData(config);
    }
  }, [config]);

  const handleChange = (key: keyof NotificationsConfig, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const data = { ...formData, user: user?.id };
      if (config?.id) {
        return pb.collection("notifications").update(config.id, data);
      } else {
        return pb.collection("notifications").create(data);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(t("success_save", "Saved successfully"));
    },
    onError: () => toast.error(t("error_save", "Error saving")),
  });

  const handleSave = () => saveMut.mutate();

  if (isLoading) {
    return <div className="h-64 rounded-3xl bg-muted/30 animate-pulse" />;
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Bell className="w-8 h-8 text-primary" />
          {t("notifications", "Notifications")}
        </h2>
        <p className="text-muted-foreground">Configure how and when you want to be notified about upcoming payments.</p>
      </div>

      <Separator />

      <div className="space-y-6">
        {PROVIDERS.map((provider) => {
          const isEnabled = !!formData[provider.enabledKey];
          const Icon = provider.icon;
          
          return (
            <div key={provider.id} className={`p-6 rounded-3xl border transition-all duration-300 ${isEnabled ? `bg-card shadow-sm ${provider.borderClass}` : 'bg-muted/10'}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl ${isEnabled ? `${provider.bgClass} ${provider.colorClass}` : 'bg-muted text-muted-foreground'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{provider.label}</h3>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                  </div>
                </div>
                <Switch 
                  checked={isEnabled} 
                  onCheckedChange={(checked) => handleChange(provider.enabledKey, checked)} 
                />
              </div>

              <div className={`space-y-4 overflow-hidden transition-all duration-300 ${isEnabled ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}>
                <Separator className="my-4" />
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="col-span-3 space-y-4">
                    {provider.fields.map(field => (
                      <div key={field.key} className="space-y-2">
                        <Label>{field.label}</Label>
                        <Input
                          type={field.type}
                          value={(formData[field.key] as string) || ""}
                          onChange={(e) => handleChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className="bg-background h-11 rounded-xl"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <Label>Days Before</Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={(formData[provider.daysKey] as number) || 3}
                      onChange={(e) => handleChange(provider.daysKey, Number(e.target.value))}
                      className="bg-background h-11 rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <div className="flex justify-end pt-4 pb-12">
          <Button size="lg" onClick={handleSave} disabled={saveMut.isPending} className="rounded-xl shadow-lg shadow-primary/20 min-w-32">
            <Save className="w-5 h-5 mr-2" />
            {t("save", "Save Changes")}
          </Button>
        </div>
      </div>
    </div>
  );
}

