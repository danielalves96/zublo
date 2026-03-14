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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bell,
  Save,
  Mail,
  MessageSquare,
  Send,
  Radio,
  Link as LinkIcon,
  MessageCircle,
  Rss,
  FlaskConical,
  Clock,
  Plus,
  X,
} from "lucide-react";
import type { NotificationsConfig, NotificationReminder } from "@/types";

// ──────────────────────────────────────────────────────────────────────────────
// Provider definitions
// ──────────────────────────────────────────────────────────────────────────────

type ProviderConfig = {
  id: string;
  label: string;
  descriptionKey: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  borderClass: string;
  fields: {
    key: keyof NotificationsConfig;
    labelKey: string;
    type: "text" | "number" | "password" | "email";
    placeholder?: string;
  }[];
  enabledKey: keyof NotificationsConfig;
};

const PROVIDERS: ProviderConfig[] = [
  {
    id: "email",
    label: "Email",
    descriptionKey: "provider_email_desc",
    icon: Mail,
    colorClass: "text-primary",
    bgClass: "bg-primary/10",
    borderClass: "border-primary/30",
    enabledKey: "email_enabled",
    fields: [
      { key: "email_to", labelKey: "destination_email", type: "email", placeholder: "you@domain.com" },
    ],
  },
  {
    id: "discord",
    label: "Discord",
    descriptionKey: "provider_discord_desc",
    icon: MessageSquare,
    colorClass: "text-[#5865F2]",
    bgClass: "bg-[#5865F2]/10",
    borderClass: "border-[#5865F2]/30",
    enabledKey: "discord_enabled",
    fields: [
      { key: "discord_webhook_url", labelKey: "webhook_url", type: "text", placeholder: "https://discord.com/api/webhooks/…" },
    ],
  },
  {
    id: "telegram",
    label: "Telegram",
    descriptionKey: "provider_telegram_desc",
    icon: Send,
    colorClass: "text-[#0088cc]",
    bgClass: "bg-[#0088cc]/10",
    borderClass: "border-[#0088cc]/30",
    enabledKey: "telegram_enabled",
    fields: [
      { key: "telegram_bot_token", labelKey: "bot_token", type: "password", placeholder: "123456:ABC-DEF…" },
      { key: "telegram_chat_id", labelKey: "chat_id", type: "text", placeholder: "123456789" },
    ],
  },
  {
    id: "gotify",
    label: "Gotify",
    descriptionKey: "provider_gotify_desc",
    icon: Radio,
    colorClass: "text-[#1660A9]",
    bgClass: "bg-[#1660A9]/10",
    borderClass: "border-[#1660A9]/30",
    enabledKey: "gotify_enabled",
    fields: [
      { key: "gotify_url", labelKey: "server_url", type: "text", placeholder: "https://gotify.example.com" },
      { key: "gotify_token", labelKey: "token", type: "password", placeholder: "AxxxxxxXxxxxxxx" },
    ],
  },
  {
    id: "pushover",
    label: "Pushover",
    descriptionKey: "provider_pushover_desc",
    icon: Rss,
    colorClass: "text-[#3DB6EE]",
    bgClass: "bg-[#3DB6EE]/10",
    borderClass: "border-[#3DB6EE]/30",
    enabledKey: "pushover_enabled",
    fields: [
      { key: "pushover_user_key", labelKey: "user_key", type: "password" },
      { key: "pushover_api_token", labelKey: "api_key", type: "password" },
    ],
  },
  {
    id: "ntfy",
    label: "ntfy.sh",
    descriptionKey: "provider_ntfy_desc",
    icon: Bell,
    colorClass: "text-[#31b88e]",
    bgClass: "bg-[#31b88e]/10",
    borderClass: "border-[#31b88e]/30",
    enabledKey: "ntfy_enabled",
    fields: [
      { key: "ntfy_url", labelKey: "server_url", type: "text", placeholder: "https://ntfy.sh" },
      { key: "ntfy_topic", labelKey: "topic", type: "text", placeholder: "mytopic" },
    ],
  },
  {
    id: "pushplus",
    label: "Pushplus",
    descriptionKey: "provider_pushplus_desc",
    icon: MessageCircle,
    colorClass: "text-[#ea4c89]",
    bgClass: "bg-[#ea4c89]/10",
    borderClass: "border-[#ea4c89]/30",
    enabledKey: "pushplus_enabled",
    fields: [
      { key: "pushplus_token", labelKey: "token", type: "password" },
    ],
  },
  {
    id: "mattermost",
    label: "Mattermost",
    descriptionKey: "provider_mattermost_desc",
    icon: MessageSquare,
    colorClass: "text-[#0058CC]",
    bgClass: "bg-[#0058CC]/10",
    borderClass: "border-[#0058CC]/30",
    enabledKey: "mattermost_enabled",
    fields: [
      { key: "mattermost_webhook_url", labelKey: "webhook_url", type: "text" },
    ],
  },
  {
    id: "serverchan",
    label: "ServerChan",
    descriptionKey: "provider_serverchan_desc",
    icon: Send,
    colorClass: "text-[#54b324]",
    bgClass: "bg-[#54b324]/10",
    borderClass: "border-[#54b324]/30",
    enabledKey: "serverchan_enabled",
    fields: [
      { key: "serverchan_send_key", labelKey: "send_key", type: "password" },
    ],
  },
  {
    id: "webhook",
    label: "Custom Webhook",
    descriptionKey: "provider_webhook_desc",
    icon: LinkIcon,
    colorClass: "text-accent",
    bgClass: "bg-accent/10",
    borderClass: "border-accent/30",
    enabledKey: "webhook_enabled",
    fields: [
      { key: "webhook_url", labelKey: "webhook_url", type: "text", placeholder: "https://api.example.com/webhook" },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Reminders editor
// ──────────────────────────────────────────────────────────────────────────────

const DEFAULT_REMINDERS: NotificationReminder[] = [{ days: 3, hour: 8 }];
const DAY_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 10, 14, 21, 30];

function RemindersEditor({
  reminders,
  onChange,
}: {
  reminders: NotificationReminder[];
  onChange: (r: NotificationReminder[]) => void;
}) {
  const { t } = useTranslation();

  const daysLabel = (days: number) => {
    if (days === 0) return t("on_payment_day", "On payment day");
    if (days === 1) return `1 ${t("day_before", "day before")}`;
    return `${days} ${t("days_before_n", "days before")}`;
  };

  const hourLabel = (h: number) => String(h).padStart(2, "0") + ":00";

  const add = () => onChange([...reminders, { days: 1, hour: 8 }]);
  const remove = (i: number) => onChange(reminders.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof NotificationReminder, value: number) =>
    onChange(reminders.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));

  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-primary/10 text-primary shrink-0">
          <Clock className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm leading-none">
            {t("reminder_schedule", "Reminder schedule")}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t("reminder_schedule_desc", "When to send notifications before each payment.")}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={add} className="rounded-xl gap-1.5 h-8 text-xs shrink-0">
          <Plus className="w-3.5 h-3.5" />
          {t("add_reminder", "Add")}
        </Button>
      </div>

      {reminders.length === 0 ? (
        <p className="text-xs text-muted-foreground italic px-1">
          {t("no_reminders", "No reminders. Add at least one to receive notifications.")}
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {reminders.map((reminder, i) => (
            <div
              key={i}
              className="flex items-center gap-1.5 bg-muted/60 rounded-xl px-2 py-1.5 border w-full"
            >
              <Select
                value={String(reminder.days)}
                onValueChange={(v) => update(i, "days", Number(v))}
              >
                <SelectTrigger className="h-7 w-auto min-w-[130px] border-0 bg-transparent p-0 text-xs font-medium focus:ring-0 shadow-none">
                  <SelectValue>{daysLabel(reminder.days)}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {DAY_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)} className="text-xs">
                      {daysLabel(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-xs text-muted-foreground shrink-0">
                {t("at_hour", "at")}
              </span>

              <Select
                value={String(reminder.hour)}
                onValueChange={(v) => update(i, "hour", Number(v))}
              >
                <SelectTrigger className="h-7 w-16 border-0 bg-transparent p-0 text-xs font-medium focus:ring-0 shadow-none">
                  <SelectValue>{hourLabel(reminder.hour)}</SelectValue>
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {Array.from({ length: 24 }, (_, h) => (
                    <SelectItem key={h} value={String(h)} className="text-xs">
                      {hourLabel(h)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <button
                onClick={() => remove(i)}
                className="text-muted-foreground hover:text-destructive transition-colors ml-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Provider card
// ──────────────────────────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  formData,
  onChange,
  onTest,
  isTesting,
}: {
  provider: ProviderConfig;
  formData: Partial<NotificationsConfig>;
  onChange: (key: keyof NotificationsConfig, value: unknown) => void;
  onTest: () => void;
  isTesting: boolean;
}) {
  const { t } = useTranslation();
  const isEnabled = !!formData[provider.enabledKey];
  const Icon = provider.icon;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
        isEnabled ? `bg-card shadow-sm ${provider.borderClass}` : "bg-muted/20 border-border/50"
      }`}
    >
      {/* Always-visible header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div
          className={`p-2 rounded-xl shrink-0 transition-colors ${
            isEnabled ? `${provider.bgClass} ${provider.colorClass}` : "bg-muted text-muted-foreground"
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm leading-none ${isEnabled ? "" : "text-muted-foreground"}`}>
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

      {/* Expandable fields */}
      <div
        className={`transition-all duration-200 ${
          isEnabled ? "max-h-[400px] opacity-100" : "max-h-0 opacity-0"
        } overflow-hidden`}
      >
        <div className="px-4 pb-4 space-y-3 border-t border-inherit pt-3">
          <div
            className={`grid gap-3 ${provider.fields.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}
          >
            {provider.fields.map((field) => (
              <div key={field.key} className="space-y-1.5">
                <Label className="text-xs">{t(field.labelKey, field.labelKey)}</Label>
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
              {isTesting ? t("sending", "Sending…") : t("test_notification", "Test")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────

export function NotificationsTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: async () => {
      try {
        const records = await pb
          .collection("notifications_config")
          .getList<NotificationsConfig>(1, 1, { filter: `user="${user?.id}"` });
        return records.items[0];
      } catch {
        return null;
      }
    },
    enabled: !!user?.id,
  });

  const [formData, setFormData] = useState<Partial<NotificationsConfig>>({});
  const [reminders, setReminders] = useState<NotificationReminder[]>(DEFAULT_REMINDERS);

  useEffect(() => {
    if (config) {
      setFormData(config);
      setReminders(
        Array.isArray(config.reminders) && config.reminders.length > 0
          ? config.reminders
          : DEFAULT_REMINDERS
      );
    }
  }, [config]);

  const handleChange = (key: keyof NotificationsConfig, value: unknown) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const saveMut = useMutation({
    mutationFn: async () => {
      const data = { ...formData, reminders, user: user?.id };
      if (config?.id) {
        return pb.collection("notifications_config").update(config.id, data);
      } else {
        return pb.collection("notifications_config").create(data);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success(t("success_save", "Saved successfully"));
    },
    onError: () => toast.error(t("error_save", "Error saving")),
  });

  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const handleTest = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      const res = await fetch("/api/notifications/test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify({ provider: providerId }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "error");
      }
      toast.success(t("notification_sent", "Test notification sent!"));
    } catch {
      toast.error(t("error_sending_notification", "Error sending notification"));
    } finally {
      setTestingProvider(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 rounded-2xl bg-muted/30 animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 rounded-2xl bg-muted/30 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const enabledCount = PROVIDERS.filter((p) => !!formData[p.enabledKey]).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Page header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Bell className="w-8 h-8 text-primary" />
          {t("notifications", "Notifications")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("notifications_desc", "Configure how and when you want to be notified about upcoming payments.")}
        </p>
      </div>

      <Separator />

      {/* Reminder schedule */}
      <RemindersEditor reminders={reminders} onChange={setReminders} />

      {/* Channels section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {t("notification_channels", "Channels")}
          </p>
          {enabledCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {enabledCount} {t("enabled", "enabled")}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          {[...PROVIDERS].sort((a, b) => {
            const aOn = !!formData[a.enabledKey];
            const bOn = !!formData[b.enabledKey];
            return aOn === bOn ? 0 : aOn ? -1 : 1;
          }).map((provider) => (
            <div
              key={provider.id}
              className={!!formData[provider.enabledKey] ? "md:col-span-2" : ""}
            >
              <ProviderCard
                provider={provider}
                formData={formData}
                onChange={handleChange}
                onTest={() => handleTest(provider.id)}
                isTesting={testingProvider === provider.id}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end pb-12">
        <Button
          size="lg"
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="rounded-xl shadow-lg shadow-primary/20 min-w-32"
        >
          <Save className="w-5 h-5 mr-2" />
          {saveMut.isPending ? t("saving", "Saving…") : t("save", "Save Changes")}
        </Button>
      </div>
    </div>
  );
}
