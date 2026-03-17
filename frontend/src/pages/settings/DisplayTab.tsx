import { useTranslation } from "react-i18next";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import pb from "@/lib/pb";
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
    mutationFn: (data: Record<string, unknown>) => pb.collection("users").update(user!.id, data),
    onSuccess: () => {
      refreshUser();
      qc.invalidateQueries({ queryKey: ["user"] });
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
    { key: "monthly_price",        label: t("show_monthly_price"),   description: "Show prices normalized to a monthly amount." },
    { key: "show_original_price",  label: t("show_original_price"),  description: "Display the original price alongside billed amounts." },
    { key: "hide_disabled",        label: t("hide_inactive"),        description: "Hide inactive subscriptions from the list." },
    { key: "disabled_to_bottom",   label: t("inactive_to_bottom"),   description: "Move inactive subscriptions to the bottom of the list." },
    { key: "subscription_progress",label: t("subscription_progress"),description: "Show a progress bar indicating billing cycle." },
    { key: "mobile_navigation",    label: t("mobile_navigation"),    description: "Show bottom navigation bar on mobile devices." },
    { key: "remove_background",    label: t("remove_background"),    description: "Remove background from subscription card logos." },
    { key: "convert_currency",     label: t("convert_currency"),     description: "Convert all prices to your primary currency." },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">{t("display")}</h2>
        <p className="text-muted-foreground">Customize how information is displayed across the app.</p>
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
