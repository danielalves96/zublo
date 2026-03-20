import { useState } from "react";

import { paymentMethodsService } from "@/services/paymentMethods";
import type { PaymentMethod } from "@/types";

const PAYMENT_ICON_MAP: Record<string, string> = {
  "visa": "Visa.png", "mastercard": "Mastercard.png",
  "american express": "Amex.png", "amex": "Amex.png",
  "discover": "Discover.png", "diners club": "DinersClub.png",
  "jcb": "JCB.png", "unionpay": "unionpay.png", "union pay": "unionpay.png",
  "maestro": "Maestro.png", "paypal": "PayPal.png",
  "apple pay": "ApplePay.png", "google pay": "GooglePay.png",
  "samsung pay": "samsungpay.png", "amazon pay": "amazonpay.png",
  "alipay": "alipay.png", "wechat pay": "wechat.png", "wechat": "wechat.png",
  "venmo": "venmo.png", "stripe": "Stripe.png", "klarna": "Klarna.png",
  "affirm": "affirm.png", "skrill": "skrill.png",
  "paysafecard": "paysafe.png", "paysafe": "paysafe.png",
  "ideal": "ideal.png", "bancontact": "bancontact.png",
  "giropay": "gitopay.png", "sofort": "sofort.png",
  "payoneer": "Payoneer.png", "interac": "Interac.png",
  "bitcoin": "Bitcoin.png", "bitcoin cash": "BitcoinCash.png",
  "ethereum": "Etherium.png", "litecoin": "Lightcoin.png",
  "direct debit": "directdebit.png", "directdebit": "directdebit.png",
  "shop pay": "shoppay.png", "shoppay": "shoppay.png",
  "facebook pay": "facebookpay.png",
};

export function getPaymentIconSrc(method: PaymentMethod): string | null {
  if (method.icon) return paymentMethodsService.iconUrl(method);
  const key = method.name.toLowerCase();
  return PAYMENT_ICON_MAP[key] ? `/assets/payments/${PAYMENT_ICON_MAP[key]}` : null;
}

export function PaymentMethodIcon({ method }: { method: PaymentMethod }) {
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
  const initials = method.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      title={method.name}
      className="h-7 w-10 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0"
    >
      {initials}
    </span>
  );
}
