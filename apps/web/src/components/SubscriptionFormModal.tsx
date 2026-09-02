import { Controller } from "react-hook-form";
import { useTranslation } from "react-i18next";

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
import { useLogoSearch } from "@/hooks/useLogoSearch";
import type { SubscriptionFormValues } from "@/hooks/useSubscriptionForm";
import { useSubscriptionForm } from "@/hooks/useSubscriptionForm";
import { compressImage } from "@/lib/image";
import { ONE_TIME_CYCLE } from "@/lib/recordTypes";
import { toast } from "@/lib/toast";
import { subscriptionsService } from "@/services/subscriptions";
import type { Category, Currency, Household, PaymentMethod, Subscription } from "@/types";

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
    setValue,
    watch,
    cycles,
    selectedCurrency,
    formState: { errors, isSubmitting },
  } = useSubscriptionForm({ sub, currencies, household });

  const watchedNotify = watch("notify");
  const watchedInactive = watch("inactive");
  const watchedRecordType = watch("record_type");
  const watchedEndMode = watch("end_mode");
  const isCredit = watchedRecordType === "credit";
  const isFiniteSchedule = !isCredit && watchedEndMode !== "never";
  const oneTimeCycle = cycles.find((cycle) => cycle.name === ONE_TIME_CYCLE);

  // ── Submit ─────────────────────────────────────────────────────────────────
  const onSubmit = async (data: SubscriptionFormValues) => {
    try {
      const body: Record<string, unknown> = {
        record_type: data.record_type,
        name: data.name,
        price: data.price,
        currency: data.currency,
        frequency: isCredit ? 1 : parseInt(data.frequency),
        cycle: isCredit && oneTimeCycle ? oneTimeCycle.id : data.cycle,
        next_payment: data.next_payment,
        start_date: data.start_date,
        payment_method: data.payment_method || null,
        payer: data.payer || null,
        category: data.category || null,
        notes: data.notes,
        url: data.url,
        auto_renew: isCredit ? false : data.end_mode === "never" ? data.auto_renew : true,
        notify: isCredit ? false : data.notify,
        notify_days_before: parseInt(data.notify_days_before),
        inactive: data.inactive,
        auto_mark_paid: isCredit ? false : data.auto_mark_paid,
        cancellation_date: data.cancellation_date || null,
        // Empty string is intentional: PocketBase clears optional date fields
        // with it, including multipart edits where null values are omitted.
        end_date: !isCredit && data.end_mode === "date" ? data.end_date : "",
        payment_limit: !isCredit && data.end_mode === "payments" ? parseInt(data.payment_limit) : 0,
        // The cron counts elapsed payments for date-bounded schedules too, so an
        // unrelated edit must not reset that tally — only dropping the schedule
        // entirely does.
        payments_completed:
          isCredit || data.end_mode === "never" ? 0 : parseInt(data.payments_completed) || 0,
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
      <DialogContent
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{sub ? t("edit_subscription") : t("add_subscription")}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>{t("record_type")}</Label>
            <Controller
              name="record_type"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value: "expense" | "credit") => {
                    field.onChange(value);
                    if (value === "credit") {
                      if (oneTimeCycle) setValue("cycle", oneTimeCycle.id);
                      setValue("frequency", "1");
                      const today = new Date();
                      setValue(
                        "next_payment",
                        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`,
                      );
                      setValue("end_mode", "never");
                      setValue("end_date", "");
                      setValue("payment_limit", "");
                      setValue("payments_completed", "0");
                      setValue("auto_renew", false);
                      setValue("notify", false);
                      setValue("auto_mark_paid", false);
                    } else {
                      const monthlyCycle = cycles.find((cycle) => cycle.name === "Monthly");
                      if (monthlyCycle) setValue("cycle", monthlyCycle.id);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">{t("expense")}</SelectItem>
                    <SelectItem value="credit">{t("credit_income")}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              {t(isCredit ? "credit_income_hint" : "expense_hint")}
            </p>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>{t("name")} *</Label>
            <Input {...register("name")} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
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
              {errors.price && <p className="text-sm text-destructive">{errors.price.message}</p>}
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
                <p className="text-sm text-destructive">{errors.currency.message}</p>
              )}
            </div>
          </div>

          {/* Frequency + Cycle */}
          {!isCredit ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("frequency")}</Label>
                <Input type="number" min="1" {...register("frequency")} />
                {errors.frequency && (
                  <p className="text-sm text-destructive">{errors.frequency.message}</p>
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
                        {cycles
                          .filter((cycle) => cycle.name !== ONE_TIME_CYCLE)
                          .map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.cycle && <p className="text-sm text-destructive">{errors.cycle.message}</p>}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border bg-muted/30 px-4 py-3">
              <p className="text-sm font-medium">{t("one_time_payout")}</p>
              <p className="text-xs text-muted-foreground">{t("one_time_payout_hint")}</p>
            </div>
          )}

          {/* Next payment + Start date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t(isCredit ? "received_on" : "next_payment")}</Label>
              <Input type="date" {...register("next_payment")} />
              {errors.next_payment && (
                <p className="text-sm text-destructive">{errors.next_payment.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("start_date")}</Label>
              <Input type="date" {...register("start_date")} />
            </div>
          </div>

          {/* Finite schedule */}
          {!isCredit && (
            <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <div className="space-y-2">
                <Label>{t("subscription_ends")}</Label>
                <Controller
                  name="end_mode"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="never">{t("never")}</SelectItem>
                        <SelectItem value="date">{t("on_date")}</SelectItem>
                        <SelectItem value="payments">{t("after_payments")}</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">{t("finite_subscription_hint")}</p>
              </div>

              {watchedEndMode === "date" && (
                <div className="space-y-2">
                  <Label>{t("end_date")}</Label>
                  <Input type="date" {...register("end_date")} />
                  {errors.end_date && (
                    <p className="text-sm text-destructive">{errors.end_date.message}</p>
                  )}
                </div>
              )}

              {watchedEndMode === "payments" && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t("number_of_payments")}</Label>
                    <Input type="number" min="1" step="1" {...register("payment_limit")} />
                    {errors.payment_limit && (
                      <p className="text-sm text-destructive">{errors.payment_limit.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>{t("payments_already_made")}</Label>
                    <Input type="number" min="0" step="1" {...register("payments_completed")} />
                    {errors.payments_completed && (
                      <p className="text-sm text-destructive">
                        {errors.payments_completed.message}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {isFiniteSchedule && (
                <p className="text-xs text-muted-foreground">{t("finite_auto_renew_hint")}</p>
              )}
            </div>
          )}

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
            {!isCredit && (
              <div className="flex items-center justify-between">
                <Label>{t("auto_renew")}</Label>
                <Controller
                  name="auto_renew"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={isFiniteSchedule || field.value}
                      onCheckedChange={field.onChange}
                      disabled={isFiniteSchedule}
                    />
                  )}
                />
              </div>
            )}
            {!isCredit && (
              <div className="flex items-center justify-between">
                <Label>{t("notify")}</Label>
                <Controller
                  name="notify"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label>{t("inactive")}</Label>
              <Controller
                name="inactive"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
            {!!authUser?.payment_tracking && !isCredit && (
              <div className="flex items-center justify-between">
                <Label>{t("auto_mark_paid")}</Label>
                <Controller
                  name="auto_mark_paid"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            )}
          </div>

          {watchedNotify && !isCredit && (
            <div className="space-y-2">
              <Label>{t("notify_days_before")}</Label>
              <Input type="number" min="0" {...register("notify_days_before")} />
            </div>
          )}

          {watchedInactive && !isCredit && (
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
