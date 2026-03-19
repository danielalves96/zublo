import { useState } from "react";
import { paymentMethodsService } from "@/services/paymentMethods";
import type { PaymentMethod } from "@/types";

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
  yandex: "Yandex.png",
  elo: "elo.png",
  qiwi: "qiwi.png",
  bitpay: "bitpay.png",
  "direct debit": "directdebit.png",
  directdebit: "directdebit.png",
  poli: "poli.png",
  webmoney: "webmoney.png",
  verifone: "verifone.png",
  "shop pay": "shoppay.png",
  shoppay: "shoppay.png",
  "facebook pay": "facebookpay.png",
  citadele: "citadele.png",
};

function getMethodIconSrc(method: PaymentMethod): string | null {
  const uploaded = paymentMethodsService.iconUrl(method);
  if (uploaded) return uploaded;

  const key = method.name.toLowerCase();
  if (PAYMENT_ICON_MAP[key]) {
    return `/assets/payments/${PAYMENT_ICON_MAP[key]}`;
  }

  return null;
}

export function PaymentMethodIcon({
  method,
  size = 40,
}: {
  method: PaymentMethod;
  size?: number;
}) {
  const [imgError, setImgError] = useState(false);
  const src = getMethodIconSrc(method);

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={method.name}
        width={size}
        height={size}
        className="rounded-lg object-contain bg-white p-0.5"
        style={{ width: size, height: size }}
        onError={() => setImgError(true)}
      />
    );
  }

  const initials = method.name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="rounded-lg bg-muted flex items-center justify-center font-semibold text-muted-foreground text-xs shrink-0"
      style={{ width: size, height: size }}
    >
      {initials}
    </div>
  );
}
