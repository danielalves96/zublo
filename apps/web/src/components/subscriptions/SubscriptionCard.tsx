import { Calendar, Copy, Edit, ExternalLink, Hourglass, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { isCredit } from "@/lib/recordTypes";
import {
  cn,
  daysUntil,
  formatDate,
  formatPrice,
  subscriptionProgress,
  toMainCurrency,
  toMonthly,
} from "@/lib/utils";
import { paymentMethodsService } from "@/services/paymentMethods";
import { subscriptionsService } from "@/services/subscriptions";
import type { Currency, PaymentMethod, Subscription } from "@/types";

// ── Payment method icon helpers ───────────────────────────────────────────────

const PAYMENT_ICON_MAP: Record<string, string> = {
  visa: "Visa.png",
  mastercard: "Mastercard.png",
  "american express": "Amex.png",
  amex: "Amex.png",
  discover: "Discover.png",
  "diners club": "DinersClub.png",
  jcb: "JCB.png",
  unionpay: "unionpay.png",
  "union pay": "unionpay.png",
  maestro: "Maestro.png",
  paypal: "PayPal.png",
  "apple pay": "ApplePay.png",
  "google pay": "GooglePay.png",
  "samsung pay": "samsungpay.png",
  "amazon pay": "amazonpay.png",
  alipay: "alipay.png",
  "wechat pay": "wechat.png",
  wechat: "wechat.png",
  venmo: "venmo.png",
  stripe: "Stripe.png",
  klarna: "Klarna.png",
  affirm: "affirm.png",
  skrill: "skrill.png",
  paysafecard: "paysafe.png",
  paysafe: "paysafe.png",
  ideal: "ideal.png",
  bancontact: "bancontact.png",
  giropay: "gitopay.png",
  sofort: "sofort.png",
  payoneer: "Payoneer.png",
  interac: "Interac.png",
  bitcoin: "Bitcoin.png",
  "bitcoin cash": "BitcoinCash.png",
  ethereum: "Etherium.png",
  litecoin: "Lightcoin.png",
  "direct debit": "directdebit.png",
  directdebit: "directdebit.png",
  "shop pay": "shoppay.png",
  shoppay: "shoppay.png",
  "facebook pay": "facebookpay.png",
};

function getPaymentIconSrc(method: PaymentMethod): string | null {
  if (method.icon) return paymentMethodsService.iconUrl(method);
  const key = method.name.toLowerCase();
  return PAYMENT_ICON_MAP[key] ? `/assets/payments/${PAYMENT_ICON_MAP[key]}` : null;
}

function PaymentMethodIcon({ method }: { method: PaymentMethod }) {
  const [err, setErr] = useState(false);
  const src = getPaymentIconSrc(method);
  if (src && !err) {
    return (
      <img
        src={src}
        alt={method.name}
        title={method.name}
        className="h-7 w-10 rounded object-contain bg-white p-0.5 shrink-0"
        onError={() => setErr(true)}
      />
    );
  }
  const initials = method.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      title={method.name}
      className="h-7 w-10 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0"
    >
      {initials}
    </span>
  );
}

interface SubscriptionActionsProps {
  sub: Subscription;
  className?: string;
  onEdit: () => void;
  onClone: () => void;
  onRenew: () => void;
  onDelete: () => void;
}

function SubscriptionActions({
  sub,
  className,
  onEdit,
  onClone,
  onRenew,
  onDelete,
}: SubscriptionActionsProps) {
  const { t } = useTranslation();
  const credit = isCredit(sub);

  return (
    <div
      className={cn(
        "flex items-center space-x-1 rounded-full border bg-background/80 p-1 shadow-sm backdrop-blur transition-opacity",
        className,
      )}
    >
      {sub.url && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary"
          onClick={() => window.open(sub.url, "_blank")}
          title={t("open_url")}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full text-muted-foreground hover:bg-blue-500/10 hover:text-blue-500"
        onClick={onEdit}
        title={t("edit")}
      >
        <Edit className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full text-muted-foreground hover:bg-green-500/10 hover:text-green-500"
        onClick={onClone}
        title={t("clone")}
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>
      {!sub.inactive && !credit && (
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 rounded-full text-muted-foreground hover:bg-amber-500/10 hover:text-amber-500"
          onClick={onRenew}
          title={t("renew")}
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        onClick={onDelete}
        title={t("delete")}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ── SubscriptionCard ──────────────────────────────────────────────────────────

export function SubscriptionCard({
  sub,
  mainCurrency,
  convertCurrency,
  showMonthly,
  showProgress,
  onEdit,
  onClone,
  onRenew,
  onDelete,
  layout = "grid",
}: {
  sub: Subscription;
  mainCurrency?: Currency;
  convertCurrency?: boolean;
  currencies?: Currency[];
  showMonthly?: boolean;
  showProgress?: boolean;
  onEdit: () => void;
  onClone: () => void;
  onRenew: () => void;
  onDelete: () => void;
  layout?: "grid" | "list";
}) {
  const { t } = useTranslation();
  const currency = sub.expand?.currency;
  const cycleName = sub.expand?.cycle?.name ?? "Monthly";
  const category = sub.expand?.category;
  const payer = sub.expand?.payer;
  const paymentMethod = sub.expand?.payment_method;
  const credit = isCredit(sub);

  const shouldConvert = convertCurrency && mainCurrency && !currency?.is_main;
  const rawPrice =
    showMonthly && !credit ? toMonthly(sub.price, cycleName, sub.frequency || 1) : sub.price;
  const price = shouldConvert ? toMainCurrency(rawPrice, currency) : rawPrice;
  const symbol = shouldConvert ? (mainCurrency?.symbol ?? "$") : (currency?.symbol ?? "$");
  const days = daysUntil(sub.next_payment);
  const progress = showProgress ? subscriptionProgress(sub.start_date, sub.next_payment) : 0;

  if (layout === "list") {
    return (
      <div
        className={cn(
          "group flex flex-col gap-3 rounded-xl border bg-card/60 p-3 backdrop-blur-sm transition-colors hover:bg-card sm:flex-row sm:items-center",
          sub.inactive && "opacity-60 grayscale-[0.3]",
        )}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-background font-bold shadow-sm">
            {sub.logo ? (
              <img
                src={subscriptionsService.logoUrl(sub) ?? ""}
                alt={sub.name}
                className="h-full w-full rounded-xl object-cover p-1"
              />
            ) : (
              <span className="flex h-full w-full items-center justify-center bg-primary/10 text-primary">
                {sub.name[0]?.toUpperCase()}
              </span>
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate font-semibold">{sub.name}</h3>
              {credit ? (
                <Badge className="shrink-0 bg-green-500/15 text-green-700 hover:bg-green-500/15 dark:text-green-400">
                  {t("credit_income")}
                </Badge>
              ) : null}
              {sub.inactive ? (
                <span className="shrink-0 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                  {t("inactive_label")}
                </span>
              ) : null}
            </div>
            <p className="truncate text-xs text-muted-foreground">
              {category?.name ?? t("category")}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 sm:contents">
          <div className="min-w-[7rem] text-left sm:text-right">
            <p
              className={cn(
                "font-mono font-bold tracking-tight",
                credit && "text-green-600 dark:text-green-400",
              )}
            >
              {credit ? "+" : ""}
              {formatPrice(price, symbol)}
            </p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {credit ? t("one_time") : showMonthly ? t("monthly") : cycleName}
            </p>
          </div>

          <div className="hidden min-w-[8.5rem] text-sm md:block">
            {sub.next_payment && !sub.inactive ? (
              <>
                <p className="text-xs text-muted-foreground">
                  {t(credit ? "received_on" : "next")}
                </p>
                <p className="font-medium">{formatDate(sub.next_payment)}</p>
              </>
            ) : null}
          </div>

          <div className="hidden min-w-[7rem] items-center gap-2 text-xs text-muted-foreground lg:flex">
            {paymentMethod ? <PaymentMethodIcon method={paymentMethod} /> : null}
            {payer ? (
              <span className="truncate font-medium text-foreground/80">{payer.name}</span>
            ) : null}
          </div>

          <SubscriptionActions
            sub={sub}
            className="shrink-0"
            onEdit={onEdit}
            onClone={onClone}
            onRenew={onRenew}
            onDelete={onDelete}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative rounded-2xl border bg-card/60 backdrop-blur-sm p-5 transition-all duration-300 hover:shadow-lg hover:bg-card hover:-translate-y-1 flex flex-col justify-between overflow-hidden",
        sub.inactive && "opacity-60 grayscale-[0.3]",
      )}
    >
      <div className="absolute -z-10 bg-gradient-to-br from-primary/5 to-transparent w-full h-full top-0 left-0 transition-opacity opacity-0 group-hover:opacity-100" />

      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-2xl overflow-hidden bg-background shadow-sm border flex items-center justify-center text-xl font-bold">
            {sub.logo ? (
              <img
                src={subscriptionsService.logoUrl(sub) ?? ""}
                alt={sub.name}
                className="h-full w-full object-cover p-1 rounded-2xl"
              />
            ) : (
              <span className="bg-primary/10 text-primary w-full h-full flex items-center justify-center">
                {sub.name[0]?.toUpperCase()}
              </span>
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors">
              {sub.name}
            </h3>
            {credit && (
              <Badge className="mr-2 mt-1 bg-green-500/15 text-green-700 hover:bg-green-500/15 dark:text-green-400">
                {t("credit_income")}
              </Badge>
            )}
            {category && (
              <span className="text-xs font-medium text-muted-foreground mr-2">
                {category.name}
              </span>
            )}
            {sub.inactive && (
              <span className="text-[10px] uppercase font-bold tracking-wider rounded-md bg-destructive/10 text-destructive px-1.5 py-0.5">
                {t("inactive_label")}
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <p
            className={cn(
              "font-extrabold text-xl font-mono tracking-tight",
              credit ? "text-green-600 dark:text-green-400" : "text-foreground",
            )}
          >
            {credit ? "+" : ""}
            {formatPrice(price, symbol)}
          </p>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {credit ? t("one_time") : showMonthly ? t("monthly") : cycleName}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {sub.next_payment && !sub.inactive && (
          <div className="flex items-center justify-between text-sm bg-background/50 border rounded-xl px-3 py-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-4 h-4" /> {t(credit ? "received_on" : "next")}
            </span>
            <div className="font-medium text-foreground flex items-center gap-2">
              {formatDate(sub.next_payment)}
              {days >= 0 && (
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    days <= 3
                      ? "bg-orange-500/10 text-orange-600 font-bold"
                      : "bg-primary/10 text-primary font-semibold",
                  )}
                >
                  {days}d
                </span>
              )}
            </div>
          </div>
        )}

        {!credit && ((sub.payment_limit ?? 0) > 0 || sub.end_date) && (
          <div className="flex items-center gap-1.5 px-1 text-xs font-medium text-muted-foreground">
            <Hourglass className="h-3.5 w-3.5" />
            {(sub.payment_limit ?? 0) > 0
              ? t("payments_progress", {
                  completed: sub.payments_completed ?? 0,
                  total: sub.payment_limit,
                })
              : t(sub.inactive ? "ended_on" : "ends_on", { date: formatDate(sub.end_date!) })}
          </div>
        )}

        {showProgress && !credit && progress > 0 && !sub.inactive && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">
              <span>{t("billing_cycle")}</span>
              <span className={days <= 3 ? "text-orange-500 font-bold" : ""}>{days}d</span>
            </div>
            <Progress
              value={progress}
              className="h-2 rounded-full bg-accent [&>div]:bg-primary/80"
            />
          </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {paymentMethod && <PaymentMethodIcon method={paymentMethod} />}
          {payer && (
            <span className="font-medium text-foreground/80">
              {t("pays")} {payer.name}
            </span>
          )}
        </div>

        <SubscriptionActions
          sub={sub}
          className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100"
          onEdit={onEdit}
          onClone={onClone}
          onRenew={onRenew}
          onDelete={onDelete}
        />
      </div>
    </div>
  );
}
