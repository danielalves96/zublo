import { useTranslation } from "react-i18next";
import { Controller } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage } from "@/lib/image";
import { toast } from "@/lib/toast";
import { subscriptionsService } from "@/services/subscriptions";
import type {
  Category,
  Currency,
  Household,
  PaymentMethod,
  Subscription,
} from "@/types";
import { useLogoSearch } from "@/hooks/useLogoSearch";
import { useSubscriptionForm } from "@/hooks/useSubscriptionForm";
import type { SubscriptionFormValues } from "@/hooks/useSubscriptionForm";
import { SubscriptionLogoSection } from "./SubscriptionLogoSection";

interface Props {
  sub: Subscription | null;
  userId: string;
  currencies: Currency[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  household: Household[];
  onClose: () => void;
  onSaved: () => void;
}

export function SubscriptionFormModal({
  sub,
  userId,
  currencies,
  categories,
  paymentMethods,
  household,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();

  const logo = useLogoSearch();
  const {
    register,
    handleSubmit,
    control,
    watch,
    cycles,
    selectedCurrency,
    formState: { errors, isSubmitting },
  } = useSubscriptionForm({ sub, currencies, household });

  const watchedNotify = watch("notify");
  const watchedInactive = watch("inactive");

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: SubscriptionFormValues) => {
    try {
      const body: Record<string, unknown> = {
        name: data.name,
        price: data.price,
        currency: data.currency,
        frequency: parseInt(data.frequency),
        cycle: data.cycle,
        next_payment: data.next_payment,
        start_date: data.start_date,
        payment_method: data.payment_method || null,
        payer: data.payer || null,
        category: data.category || null,
        notes: data.notes,
        url: data.url,
        auto_renew: data.auto_renew,
        notify: data.notify,
        notify_days_before: parseInt(data.notify_days_before),
        inactive: data.inactive,
        auto_mark_paid: data.auto_mark_paid,
        cancellation_date: data.cancellation_date || null,
        user: userId,
      };

      let result: Subscription;
      let logoToUpload = logo.logoFile;

      if (!logoToUpload && logo.logoUrl) {
        try {
          const direct = await fetch(logo.logoUrl);
          if (!direct.ok) throw new Error("logo_fetch_failed");
          const blob = await direct.blob();
          /* v8 ignore next */
          const extFromType = blob.type?.split("/")?.[1] || "png";
          /* v8 ignore next */
          const mimeType = blob.type || "image/png";
          logoToUpload = new File([blob], `logo.${extFromType}`, {
            type: mimeType,
          });
        } catch {
          toast.error(t("error_fetching_image_results"));
          return;
        }
      }

      if (logoToUpload) {
        logoToUpload = await compressImage(logoToUpload, { maxSize: 256 });
        const formData = new FormData();
        Object.entries(body).forEach(([k, v]) => {
          if (v !== null && v !== undefined) formData.append(k, String(v));
        });
        formData.append("logo", logoToUpload);
        if (sub) {
          result = await subscriptionsService.update(sub.id, formData);
        } else {
          result = await subscriptionsService.create(formData);
        }
      } else {
        if (sub) {
          result = await subscriptionsService.update(sub.id, body);
        } else {
          result = await subscriptionsService.create(body);
        }
      }

      void result;
      toast.success(t("success"));
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("unknown_error");
      toast.error(msg);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {sub ? t("edit_subscription") : t("add_subscription")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>{t("name")} *</Label>
            <Input {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Logo section */}
          <SubscriptionLogoSection {...logo} />

          {/* Price + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("price")} *</Label>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    value={field.value}
                    onChange={field.onChange}
                    symbol={selectedCurrency?.symbol}
                    code={selectedCurrency?.code}
                  />
                )}
              />
              {errors.price && (
                <p className="text-sm text-destructive">
                  {errors.price.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("currency")}</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.symbol} {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.currency && (
                <p className="text-sm text-destructive">
                  {errors.currency.message}
                </p>
              )}
            </div>
          </div>

          {/* Frequency + Cycle */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("frequency")}</Label>
              <Input type="number" min="1" {...register("frequency")} />
              {errors.frequency && (
                <p className="text-sm text-destructive">
                  {errors.frequency.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("cycle")}</Label>
              <Controller
                name="cycle"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cycles.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.cycle && (
                <p className="text-sm text-destructive">
                  {errors.cycle.message}
                </p>
              )}
            </div>
          </div>

          {/* Next payment + Start date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("next_payment")}</Label>
              <Input type="date" {...register("next_payment")} />
              {errors.next_payment && (
                <p className="text-sm text-destructive">
                  {errors.next_payment.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("start_date")}</Label>
              <Input type="date" {...register("start_date")} />
            </div>
          </div>

          {/* Category + Payer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("category")}</Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("optional")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("payer")}</Label>
              <Controller
                name="payer"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("optional")} />
                    </SelectTrigger>
                    <SelectContent>
                      {household.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label>{t("payment_method")}</Label>
            <Controller
              name="payment_method"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("optional")} />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* URL + Notes */}
          <div className="space-y-2">
            <Label>{t("url")}</Label>
            <Input type="url" {...register("url")} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>{t("notes")}</Label>
            <Textarea {...register("notes")} rows={2} />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label>{t("auto_renew")}</Label>
              <Controller
                name="auto_renew"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("notify")}</Label>
              <Controller
                name="notify"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("inactive")}</Label>
              <Controller
                name="inactive"
                control={control}
                render={({ field }) => (
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
            </div>
            {!!authUser?.payment_tracking && (
              <div className="flex items-center justify-between">
                <Label>{t("auto_mark_paid")}</Label>
                <Controller
                  name="auto_mark_paid"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  )}
                />
              </div>
            )}
          </div>

          {watchedNotify && (
            <div className="space-y-2">
              <Label>{t("notify_days_before")}</Label>
              <Input
                type="number"
                min="0"
                {...register("notify_days_before")}
              />
            </div>
          )}

          {watchedInactive && (
            <div className="space-y-2">
              <Label>{t("cancellation_date")}</Label>
              <Input type="date" {...register("cancellation_date")} />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("loading") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
