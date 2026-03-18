import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { usersService } from "@/services/users";
import { queryKeys } from "@/lib/queryKeys";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Receipt } from "lucide-react";

type DisplayKey =
  | "monthly_price"
  | "show_original_price"
  | "hide_disabled"
  | "disabled_to_bottom"
  | "subscription_progress"
  | "mobile_navigation"
  | "remove_background"
  | "convert_currency"
  | "payment_tracking";

function useUserMutation() {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => usersService.update(user!.id, data),
    onSuccess: () => {
      refreshUser();
      qc.invalidateQueries({ queryKey: queryKeys.user() });
    },
  });
}

export function DisplayTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const mut = useUserMutation();

  const toggleField = (key: DisplayKey) => {
    mut.mutate({ [key]: !user?.[key as keyof typeof user] });
  };

  const displayToggles: { key: DisplayKey; label: string; description: string }[] = [
    { key: "monthly_price",        label: t("monthly_price"),        description: t("monthly_price_desc") },
    { key: "show_original_price",  label: t("show_original_price"),  description: t("show_original_price_desc") },
    { key: "hide_disabled",        label: t("hide_disabled"),        description: t("hide_disabled_desc") },
    { key: "disabled_to_bottom",   label: t("disabled_to_bottom"),   description: t("disabled_to_bottom_desc") },
    { key: "subscription_progress",label: t("subscription_progress"),description: t("subscription_progress_desc") },
    { key: "mobile_navigation",    label: t("mobile_navigation"),    description: t("mobile_navigation_desc") },
    { key: "remove_background",    label: t("remove_background"),    description: t("remove_background_desc") },
    { key: "convert_currency",     label: t("convert_currency"),     description: t("convert_currency_desc") },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">{t("display")}</h2>
        <p className="text-muted-foreground">{t("display_desc")}</p>
      </div>

      <Separator />

      <div className="space-y-3">
        {displayToggles.map(({ key, label, description }) => (
          <div
            key={key}
            className="flex items-start justify-between gap-4 rounded-2xl border bg-card p-4 hover:bg-muted/30 transition-colors"
          >
            <div className="space-y-0.5">
              <Label className="text-base font-medium cursor-pointer">{label}</Label>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Switch
              checked={!!user?.[key as keyof typeof user]}
              onCheckedChange={() => toggleField(key)}
              className="shrink-0 mt-0.5"
            />
          </div>
        ))}
      </div>

      <Separator />

      {/* Payment Tracking */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Receipt className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-lg">{t("payment_tracking")}</h3>
        </div>
        <p className="text-sm text-muted-foreground">{t("payment_tracking_desc")}</p>

        <div className="flex items-start justify-between gap-4 rounded-2xl border bg-card p-4 hover:bg-muted/30 transition-colors">
          <div className="space-y-0.5">
            <Label className="text-base font-medium cursor-pointer">{t("payment_tracking")}</Label>
            <p className="text-sm text-muted-foreground">{t("payment_tracking_desc")}</p>
          </div>
          <Switch
            checked={!!user?.payment_tracking}
            onCheckedChange={() => toggleField("payment_tracking")}
            className="shrink-0 mt-0.5"
          />
        </div>
      </div>
    </div>
  );
}
