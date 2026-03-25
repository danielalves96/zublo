import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { queryKeys } from "@/lib/queryKeys";
import { cyclesService } from "@/services/cycles";
import type { Currency, Household, Subscription } from "@/types";

const fetchCycles = () => cyclesService.list();

// Static schema used only for type inference (no i18n needed for the type)
const _schemaShape = z.object({
  name: z.string(),
  price: z.number(),
  currency: z.string(),
  frequency: z.string(),
  cycle: z.string(),
  next_payment: z.string(),
  start_date: z.string(),
  payment_method: z.string(),
  payer: z.string(),
  category: z.string(),
  notes: z.string(),
  url: z.string(),
  auto_renew: z.boolean(),
  notify: z.boolean(),
  notify_days_before: z.string(),
  inactive: z.boolean(),
  auto_mark_paid: z.boolean(),
  cancellation_date: z.string(),
});

export type SubscriptionFormValues = z.infer<typeof _schemaShape>;

interface UseSubscriptionFormInput {
  sub: Subscription | null;
  currencies: Currency[];
  household: Household[];
}

const nextMonthDate = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
};

export function useSubscriptionForm({
  sub,
  currencies,
  household,
}: UseSubscriptionFormInput) {
  const { t } = useTranslation();

  const { data: cycles = [] } = useQuery({
    queryKey: queryKeys.cycles(),
    queryFn: fetchCycles,
  });

  const schema = z.object({
    name: z.string().min(1, t("required")),
    price: z.number().nonnegative(),
    currency: z.string().min(1, t("required")),
    frequency: z.string().min(1, t("required")),
    cycle: z.string().min(1, t("required")),
    next_payment: z.string().min(1, t("required")),
    start_date: z.string().min(1, t("required")),
    payment_method: z.string(),
    payer: z.string(),
    category: z.string(),
    notes: z.string(),
    url: z.string(),
    auto_renew: z.boolean(),
    notify: z.boolean(),
    notify_days_before: z.string(),
    inactive: z.boolean(),
    auto_mark_paid: z.boolean(),
    cancellation_date: z.string(),
  });

  const form = useForm<SubscriptionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      price: 0,
      currency: "",
      frequency: "1",
      cycle: "",
      next_payment: nextMonthDate(),
      start_date: new Date().toISOString().split("T")[0],
      payment_method: "",
      payer: "",
      category: "",
      notes: "",
      url: "",
      auto_renew: true,
      notify: false,
      notify_days_before: "3",
      inactive: false,
      auto_mark_paid: false,
      cancellation_date: "",
    },
  });

  const { reset, watch } = form;

  // ── Pre-fill / reset form when sub or dependencies change ─────────────────
  useEffect(() => {
    if (sub) {
      reset({
        name: sub.name,
        price: sub.price,
        currency: sub.currency,
        frequency: String(sub.frequency),
        cycle: sub.cycle,
        next_payment: sub.next_payment,
        start_date: sub.start_date || new Date().toISOString().split("T")[0],
        payment_method: sub.payment_method || "",
        payer: sub.payer || "",
        category: sub.category || "",
        notes: sub.notes || "",
        url: sub.url || "",
        auto_renew: sub.auto_renew,
        notify: sub.notify,
        notify_days_before: String(sub.notify_days_before || 3),
        inactive: sub.inactive,
        auto_mark_paid: !!sub.auto_mark_paid,
        cancellation_date: sub.cancellation_date || "",
      });
    } else {
      const mainCur = currencies.find((c) => c.is_main);
      const monthCycle = cycles.find((c) => c.name === "Monthly");
      reset({
        name: "",
        price: 0,
        currency: mainCur?.id || currencies[0]?.id || "",
        frequency: "1",
        cycle: monthCycle?.id || cycles[0]?.id || "",
        next_payment: nextMonthDate(),
        start_date: new Date().toISOString().split("T")[0],
        payment_method: "",
        payer: household[0]?.id || "",
        category: "",
        notes: "",
        url: "",
        auto_renew: true,
        notify: false,
        notify_days_before: "3",
        inactive: false,
        auto_mark_paid: false,
        cancellation_date: "",
      });
    }
  }, [sub, currencies, cycles, household, reset]);

  const watchedCurrency = watch("currency");
  const selectedCurrency = currencies.find((c) => c.id === watchedCurrency);

  return { ...form, cycles, selectedCurrency };
}
