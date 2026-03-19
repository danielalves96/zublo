import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { notificationsService } from "@/services/notifications";
import { queryKeys } from "@/lib/queryKeys";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProviderCard } from "@/components/settings/notifications/ProviderCard";
import { RemindersEditor } from "@/components/settings/notifications/RemindersEditor";
import {
  DEFAULT_REMINDERS,
  PROVIDERS,
} from "@/components/settings/notifications/config";
import { Bell, Save } from "lucide-react";
import type { NotificationsConfig, NotificationReminder } from "@/types";

// ──────────────────────────────────────────────────────────────────────────────
// Main component
// ──────────────────────────────────────────────────────────────────────────────

export function NotificationsTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: queryKeys.notificationsConfig(user?.id ?? ""),
    queryFn: () => notificationsService.getConfig(user!.id),
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
        return notificationsService.updateConfig(config.id, data);
      } else {
        return notificationsService.createConfig(data);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.notificationsConfig(user?.id ?? "") });
      toast.success(t("success_save", "Saved successfully"));
    },
    onError: () => toast.error(t("error_save", "Error saving")),
  });

  const [testingProvider, setTestingProvider] = useState<string | null>(null);

  const handleTest = async (providerId: string) => {
    setTestingProvider(providerId);
    try {
      await notificationsService.test(providerId);
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
              className={formData[provider.enabledKey] ? "md:col-span-2" : ""}
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
