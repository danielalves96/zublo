import { useQuery } from "@tanstack/react-query";
import { ArrowRight, History, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { queryKeys } from "@/lib/queryKeys";
import { isCredit } from "@/lib/recordTypes";
import { cn, formatDate, formatPrice } from "@/lib/utils";
import { subscriptionHistoryService } from "@/services/subscriptionHistory";
import type { Subscription,SubscriptionHistory } from "@/types";

import { type HistoryEntry, toHistoryEntries } from "./subscriptionHistoryEntries";

function TotalCard({
  label,
  value,
  caption,
  note,
  highlight,
}: {
  label: string;
  value: string;
  caption: string;
  note: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        highlight ? "bg-primary/5 border-primary/30" : "bg-card/60",
      )}
    >
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-extrabold tracking-tight">{value}</p>
      <p className="mt-1 text-xs font-medium text-foreground/70">{caption}</p>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{note}</p>
    </div>
  );
}

function EntryValue({ entry, symbol }: { entry: HistoryEntry; symbol: string }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-1.5 text-sm">
      {entry.fromPrice !== null && (
        <span className="font-mono text-muted-foreground line-through">
          {formatPrice(entry.fromPrice, symbol)}
        </span>
      )}
      {entry.fromText && (
        <span className="text-muted-foreground">{entry.fromText}</span>
      )}
      {(entry.fromPrice !== null || entry.fromText) && (
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
      )}
      {entry.toPrice !== null && (
        <span className="font-mono font-bold">{formatPrice(entry.toPrice, symbol)}</span>
      )}
      {entry.toText && <span className="font-medium">{entry.toText}</span>}
      {entry.changePercent !== null && (
        <Badge
          className={cn(
            "gap-1",
            entry.tone === "increase"
              ? "bg-destructive/10 text-destructive hover:bg-destructive/10"
              : "bg-green-500/15 text-green-700 hover:bg-green-500/15 dark:text-green-400",
          )}
        >
          {entry.tone === "increase" ? (
            <TrendingUp className="h-3 w-3" aria-hidden />
          ) : (
            <TrendingDown className="h-3 w-3" aria-hidden />
          )}
          {entry.changePercent > 0 ? "+" : ""}
          {entry.changePercent}%
        </Badge>
      )}
    </div>
  );
}

function HistoryContent({
  history,
  credit,
}: {
  history: SubscriptionHistory;
  credit: boolean;
}) {
  const { t } = useTranslation();
  const symbol = history.subscription.currency_symbol || "$";
  const totals = history.totals;
  const entries = toHistoryEntries(history.events);

  const spentCaption = [
    totals.since ? t("history_since", { date: formatDate(totals.since) }) : "",
    t("history_payments", { payments: totals.estimated_payments }),
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <TotalCard
          highlight
          label={credit ? t("total_received") : t("total_spent")}
          value={formatPrice(totals.estimated_total, symbol)}
          caption={spentCaption}
          note={t("history_estimate_note")}
        />
        {totals.paid_payments > 0 && (
          <TotalCard
            label={t("confirmed_label")}
            value={formatPrice(totals.paid_total, symbol)}
            caption={t("history_payments", { payments: totals.paid_payments })}
            note={t("history_confirmed_note")}
          />
        )}
      </div>

      {entries.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t("no_history_yet")}
        </p>
      ) : (
        <ol className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start justify-between gap-3 rounded-xl border bg-background/50 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{t(entry.labelKey)}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(entry.date)}
                  {entry.backfilled ? ` · ${t("history_backfilled")}` : ""}
                </p>
              </div>
              <EntryValue entry={entry} symbol={symbol} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function SubscriptionHistoryDialog({
  sub,
  userId,
  onClose,
}: {
  sub: Subscription;
  userId: string;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.subscriptions.history(userId, sub.id),
    queryFn: () => subscriptionHistoryService.get(sub.id),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] w-[96vw] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-primary" aria-hidden />
            {sub.name}
          </DialogTitle>
          <DialogDescription>{t("subscription_history_desc")}</DialogDescription>
        </DialogHeader>

        {isLoading && (
          <div
            aria-label={t("subscription_history")}
            className="h-40 animate-pulse rounded-2xl bg-muted"
            role="status"
          />
        )}

        {isError && (
          <p className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {t("failed_to_load_history")}
          </p>
        )}

        {data && <HistoryContent history={data} credit={isCredit(sub)} />}
      </DialogContent>
    </Dialog>
  );
}
