import type {
  SubscriptionHistoryEvent,
  SubscriptionHistoryEventType,
} from "@/types";

/**
 * Turns the raw change log into rows the history dialog can render directly.
 *
 * The dialog stays a rendering concern: which values a given event type puts
 * on screen — and whether a price moved up or down — is decided here.
 */

const LABEL_KEYS: Record<SubscriptionHistoryEventType, string> = {
  created: "history_event_created",
  price_changed: "history_event_price_changed",
  cycle_changed: "history_event_cycle_changed",
  currency_changed: "history_event_currency_changed",
  paused: "history_event_paused",
  resumed: "history_event_resumed",
};

export type HistoryEntryTone = "neutral" | "increase" | "decrease";

export interface HistoryEntry {
  id: string;
  date: string;
  eventType: SubscriptionHistoryEventType;
  labelKey: string;
  /** Set for events that moved money; the dialog formats them with a symbol. */
  fromPrice: number | null;
  toPrice: number | null;
  /** Set for events that moved a label (cycle, currency) instead of a price. */
  fromText: string | null;
  toText: string | null;
  changePercent: number | null;
  tone: HistoryEntryTone;
  backfilled: boolean;
}

/** "Monthly", or "3× Monthly" when the subscription bills every few cycles. */
export function cycleLabel(cycle: string, frequency: number): string {
  if (!cycle) return "";
  return frequency > 1 ? `${frequency}× ${cycle}` : cycle;
}

/**
 * Percentage a price moved, to one decimal.
 *
 * Returns null when there is nothing to compare against — a subscription that
 * used to be free has no meaningful percentage increase.
 */
export function priceChangePercent(
  oldPrice: number,
  newPrice: number,
): number | null {
  if (!oldPrice || oldPrice <= 0) return null;
  return Math.round(((newPrice - oldPrice) / oldPrice) * 1000) / 10;
}

function toneFor(event: SubscriptionHistoryEvent): HistoryEntryTone {
  if (event.event_type !== "price_changed") return "neutral";
  if (event.new_price > event.old_price) return "increase";
  if (event.new_price < event.old_price) return "decrease";
  return "neutral";
}

function toEntry(event: SubscriptionHistoryEvent): HistoryEntry | null {
  const labelKey = LABEL_KEYS[event.event_type];
  if (!labelKey) return null;

  const entry: HistoryEntry = {
    id: event.id,
    date: event.effective_date,
    eventType: event.event_type,
    labelKey,
    fromPrice: null,
    toPrice: null,
    fromText: null,
    toText: null,
    changePercent: null,
    tone: toneFor(event),
    backfilled: event.note === "backfilled",
  };

  if (event.event_type === "created") {
    entry.toPrice = event.new_price;
    entry.toText = cycleLabel(event.new_cycle, event.new_frequency);
  }

  if (event.event_type === "price_changed") {
    entry.fromPrice = event.old_price;
    entry.toPrice = event.new_price;
    entry.changePercent = priceChangePercent(event.old_price, event.new_price);
  }

  if (event.event_type === "cycle_changed") {
    entry.fromText = cycleLabel(event.old_cycle, event.old_frequency);
    entry.toText = cycleLabel(event.new_cycle, event.new_frequency);
  }

  if (event.event_type === "currency_changed") {
    entry.fromText = event.old_currency;
    entry.toText = event.new_currency;
  }

  return entry;
}

/**
 * Newest change first — a history is read from what just happened backwards.
 * Events sharing an effective date (one save can change price and cycle at
 * once) keep the order the backend wrote them in.
 */
export function toHistoryEntries(
  events: SubscriptionHistoryEvent[],
): HistoryEntry[] {
  return events
    .map((event, index) => ({ event, index }))
    .sort((a, b) => {
      if (a.event.effective_date === b.event.effective_date) {
        return b.index - a.index;
      }
      return a.event.effective_date < b.event.effective_date ? 1 : -1;
    })
    .map(({ event }) => toEntry(event))
    .filter((entry): entry is HistoryEntry => entry !== null);
}
