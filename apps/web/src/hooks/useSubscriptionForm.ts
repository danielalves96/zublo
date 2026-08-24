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
  end_mode: z.enum(["never", "date", "payments"]),
  end_date: z.string(),
  payment_limit: z.string(),
  payments_completed: z.string(),
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

const toDateOnly = (value: string | null | undefined): string => {
  if (!value) return "";
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? value.slice(0, 10);
};

export function useSubscriptionForm({ sub, currencies, household }: UseSubscriptionFormInput) {
  const { t } = useTranslation();

  const { data: cycles = [] } = useQuery({
    queryKey: queryKeys.cycles(),
    queryFn: fetchCycles,
  });

  const schema = z
    .object({
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
      end_mode: z.enum(["never", "date", "payments"]),
      end_date: z.string(),
      payment_limit: z.string(),
      payments_completed: z.string(),
    })
    .superRefine((values, context) => {
      if (values.end_mode === "date") {
        if (!values.end_date) {
          context.addIssue({
            code: "custom",
            path: ["end_date"],
            message: t("required"),
          });
        } else if (values.end_date < values.next_payment) {
          context.addIssue({
            code: "custom",
            path: ["end_date"],
            message: t("end_date_after_next_payment"),
          });
        }
      }

      if (values.end_mode === "payments") {
        const limit = Number(values.payment_limit);
        const completed = Number(values.payments_completed);
        if (!Number.isInteger(limit) || limit < 1) {
          context.addIssue({
            code: "custom",
            path: ["payment_limit"],
            message: t("positive_payment_limit"),
          });
        }
        if (!Number.isInteger(completed) || completed < 0 || completed > limit) {
          context.addIssue({
            code: "custom",
            path: ["payments_completed"],
            message: t("payments_completed_range"),
          });
        } else if (completed === limit && !values.inactive) {
          context.addIssue({
            code: "custom",
            path: ["payments_completed"],
            message: t("payments_completed_reactivate"),
          });
        }
      }
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
      end_mode: "never",
      end_date: "",
      payment_limit: "",
      payments_completed: "0",
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
        next_payment: toDateOnly(sub.next_payment),
        start_date: toDateOnly(sub.start_date) || new Date().toISOString().split("T")[0],
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
        cancellation_date: toDateOnly(sub.cancellation_date),
        end_mode: (sub.payment_limit ?? 0) > 0 ? "payments" : sub.end_date ? "date" : "never",
        end_date: toDateOnly(sub.end_date),
        payment_limit: sub.payment_limit ? String(sub.payment_limit) : "",
        payments_completed: String(sub.payments_completed ?? 0),
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
        end_mode: "never",
        end_date: "",
        payment_limit: "",
        payments_completed: "0",
      });
    }
  }, [sub, currencies, cycles, household, reset]);

  const watchedCurrency = watch("currency");
  const selectedCurrency = currencies.find((c) => c.id === watchedCurrency);

  return { ...form, cycles, selectedCurrency };
}
