import {
  Banknote,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Clock,
  CreditCard,
  ExternalLink,
  Eye,
  FileText,
  Pencil,
  Tag,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { daysUntil, formatDate, formatPrice, sanitizeHref } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { paymentRecordsService } from "@/services/paymentRecords";
import type { Currency, PaymentRecord,Subscription } from "@/types";

import { InfoRow } from "./InfoRow";
import { getLogoUrl,toMain } from "./types";

interface SubDetailDialogProps {
  sub: Subscription;
  date: Date;
  currencies: Currency[];
  mainCurrency: Currency | undefined;
  paymentTracking: boolean;
  paymentRecord: PaymentRecord | undefined;
  onClose: () => void;
  onEdit: (s: Subscription) => void;
  onMarkAsPaid: () => void;
  t: (k: string) => string;
}

export function SubDetailDialog({
  sub,
  date,
  currencies,
  mainCurrency,
  paymentTracking,
  paymentRecord,
  onClose,
  onEdit,
  onMarkAsPaid,
  t,
}: SubDetailDialogProps) {
  const cur =
    sub.expand?.currency ?? currencies.find((c) => c.id === sub.currency);
  const cycle = sub.expand?.cycle;
  const category = sub.expand?.category;
  const paymentMethod = sub.expand?.payment_method;
  const payer = sub.expand?.payer;
  const logo = getLogoUrl(sub);

  const cycleLabel = cycle
    ? `${sub.frequency > 1 ? `Every ${sub.frequency} ` : ""}${cycle.name
        .replace("ly", "")
        .toLowerCase()}${sub.frequency > 1 ? "s" : ""}`
    : "";

  const dLeft = daysUntil(sub.next_payment);
  const isPaid = !!paymentRecord?.paid_at;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isOverdue = paymentTracking && !isPaid && date < today;

  const proofUrl = paymentRecord ? paymentRecordsService.proofUrl(paymentRecord) : null;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-[96vw] max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="border-b bg-card/70 backdrop-blur px-6 py-5">
          <DialogTitle className="flex items-center gap-4">
            {logo ? (
              <div className="h-14 w-14 shrink-0 rounded-2xl overflow-hidden border bg-background p-2">
                <img
                  src={logo}
                  alt=""
                  className="h-full w-full object-contain"
                  onError={(e) =>
                    ((e.target as HTMLElement).style.display = "none")
                  }
                />
              </div>
            ) : (
              <div className="h-14 w-14 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center text-xl font-bold text-primary">
                {sub.name[0]?.toUpperCase()}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-xl font-bold leading-tight truncate">
                {sub.name}
              </p>
              <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                {sub.inactive ? (
                  <Badge variant="secondary" className="text-xs">
                    {t("inactive")}
                  </Badge>
                ) : (
                  <Badge className="bg-green-500/15 text-green-700 dark:text-green-400 text-xs">
                    {t("active")}
                  </Badge>
                )}
                {cycle && (
                  <Badge variant="outline" className="text-xs">
                    {cycleLabel}
                  </Badge>
                )}
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-2xl font-extrabold leading-none">
                {formatPrice(sub.price, cur?.symbol ?? "$")}
              </p>
              {cur && mainCurrency && cur.id !== mainCurrency.id && (
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ {formatPrice(toMain(sub.price, cur), mainCurrency.symbol)}
                </p>
              )}
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="p-6 space-y-5">
          {paymentTracking && (
            <div
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-4 py-3.5",
                isPaid
                  ? "bg-green-500/10 border-green-500/20"
                  : isOverdue
                    ? "bg-red-500/10 border-red-500/20"
                    : "bg-muted/50 border-border",
              )}
            >
              {isPaid ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-green-700 dark:text-green-400">
                      {t("paid")}
                    </p>
                    {paymentRecord?.paid_at && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {new Date(paymentRecord.paid_at).toLocaleDateString()}
                        {paymentRecord.amount != null &&
                          ` · ${formatPrice(paymentRecord.amount, cur?.symbol ?? "$")}`}
                      </p>
                    )}
                  </div>
                  {proofUrl && (
                    <a
                      href={proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="gap-1.5">
                        <Eye className="h-3.5 w-3.5" />
                        {t("proof")}
                      </Button>
                    </a>
                  )}
                </>
              ) : isOverdue ? (
                <>
                  <CircleDot className="h-5 w-5 text-red-500 shrink-0" />
                  <p className="font-semibold text-red-700 dark:text-red-400">
                    {t("overdue")} · {t("not_paid")}
                  </p>
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                  <p className="font-medium text-muted-foreground">
                    {t("pending_payment")}
                  </p>
                </>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold mb-3">
                {t("details")}
              </p>
              <div className="space-y-3">
                <InfoRow
                  icon={<CalendarDays className="h-4 w-4" />}
                  label={t("next_payment")}
                >
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <span>{formatDate(sub.next_payment)}</span>
                    {dLeft === 0 && (
                      <Badge className="text-[10px] bg-amber-500 text-white">
                        {t("today")}
                      </Badge>
                    )}
                    {dLeft > 0 && (
                      <Badge variant="secondary" className="text-[10px]">
                        {dLeft}d
                      </Badge>
                    )}
                    {dLeft < 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        {t("overdue")}
                      </Badge>
                    )}
                  </span>
                </InfoRow>

                {category && (
                  <InfoRow
                    icon={<Tag className="h-4 w-4" />}
                    label={t("category")}
                  >
                    {category.name}
                  </InfoRow>
                )}

                {paymentMethod && (
                  <InfoRow
                    icon={<CreditCard className="h-4 w-4" />}
                    label={t("payment_method")}
                  >
                    {paymentMethod.name}
                  </InfoRow>
                )}

                {payer && (
                  <InfoRow
                    icon={<Users className="h-4 w-4" />}
                    label={t("payer")}
                  >
                    {payer.name}
                  </InfoRow>
                )}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-4">
              <p className="text-sm font-semibold mb-3">
                {t("more_info")}
              </p>
              <div className="space-y-3">
                {sub.start_date && (
                  <InfoRow
                    icon={<Clock className="h-4 w-4" />}
                    label={t("start_date")}
                  >
                    {formatDate(sub.start_date)}
                  </InfoRow>
                )}

                {sub.url && (() => {
                  const safeUrl = sanitizeHref(sub.url);
                  return (
                    <InfoRow
                      icon={<ExternalLink className="h-4 w-4" />}
                      label={t("url")}
                    >
                      {safeUrl ? (
                        <a
                          href={safeUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary underline-offset-2 hover:underline"
                        >
                          {safeUrl.replace(/^https?:\/\//, "").split("/")[0]}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-xs">
                          {sub.url.split("/")[0]}
                        </span>
                      )}
                    </InfoRow>
                  );
                })()}

                <InfoRow
                  icon={<Banknote className="h-4 w-4" />}
                  label={t("auto_renew")}
                >
                  {sub.auto_renew ? t("yes") : t("no")}
                </InfoRow>
              </div>
            </div>
          </div>

          {sub.notes && (
            <div className="rounded-2xl border bg-muted/30 p-4">
              <p className="text-sm font-semibold mb-2">
                {t("notes")}
              </p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {sub.notes}
              </p>
            </div>
          )}

          <div className="flex gap-2 justify-end flex-wrap border-t pt-4">
            <Button variant="outline" onClick={onClose}>
              {t("close")}
            </Button>
            {paymentTracking && !isPaid && (
              <Button
                variant="outline"
                className="border-green-500/40 text-green-700 dark:text-green-400 hover:bg-green-500/10"
                onClick={onMarkAsPaid}
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                {t("mark_as_paid")}
              </Button>
            )}
            {paymentTracking && isPaid && (
              <Button
                variant="ghost"
                className="text-muted-foreground"
                onClick={onMarkAsPaid}
              >
                <FileText className="h-4 w-4 mr-2" />
                {t("view_payment")}
              </Button>
            )}
            <Button onClick={() => onEdit(sub)}>
              <Pencil className="h-4 w-4 mr-2" />
              {t("edit")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
