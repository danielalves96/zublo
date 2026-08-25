var limits = require("./subscription-limits.js");

/**
 * Pure history logic: diffing a subscription write, replaying the resulting
 * events into a price timeline, and totalling what that timeline cost.
 *
 * Everything here is deliberately free of PocketBase APIs so the money math
 * can be exercised directly. The DB-facing half lives in
 * lib/subscription-history.js.
 */

/**
 * Ceiling on how many occurrences a single total may walk.
 *
 * The walk is bounded by `until` and by the cycle advancing, but a corrupt row
 * (a daily cycle with a start date decades back, say) should not be able to
 * spin a request for minutes. 20k daily payments is ~55 years of history.
 */
var MAX_OCCURRENCES = 20000;

/** Event types that describe a change to the money math. */
var TIMELINE_EVENTS = ["created", "price_changed", "cycle_changed"];

function toNumber(value) {
  var parsed = Number(value);
  return isFinite(parsed) ? parsed : 0;
}

function roundMoney(value) {
  return Math.round(value * 100) / 100;
}

function normalizeSnapshot(input) {
  var source = input || {};
  var frequency = Math.floor(toNumber(source.frequency));

  return {
    price: toNumber(source.price),
    cycleName: String(source.cycleName || ""),
    frequency: frequency > 0 ? frequency : 1,
    currency: String(source.currency || ""),
    inactive: !!source.inactive,
  };
}

function changeEvent(type, from, to, effectiveDate) {
  return {
    event_type: type,
    effective_date: effectiveDate,
    old_price: from.price,
    new_price: to.price,
    old_cycle: from.cycleName,
    new_cycle: to.cycleName,
    old_frequency: from.frequency,
    new_frequency: to.frequency,
    old_currency: from.currency,
    new_currency: to.currency,
  };
}

/**
 * The opening event of a timeline: no "old" side, because there was none.
 */
function createdEvent(snapshot, effectiveDate) {
  var to = normalizeSnapshot(snapshot);
  var empty = { price: 0, cycleName: "", frequency: 0, currency: "", inactive: false };
  var event = changeEvent("created", empty, to, limits.dateOnly(effectiveDate));
  event.old_frequency = 0;
  return event;
}

/**
 * Diffs two subscription snapshots into the events worth logging.
 *
 * A single save can change several things at once (a plan upgrade usually
 * moves price *and* cycle), so this returns every change it finds rather than
 * collapsing them into one "updated" row: the timeline needs the price events
 * on their own to reprice past payments correctly.
 */
function diffSubscriptionSnapshot(before, after, effectiveDate) {
  var from = normalizeSnapshot(before);
  var to = normalizeSnapshot(after);
  var date = limits.dateOnly(effectiveDate);
  var events = [];

  if (from.price !== to.price) {
    events.push(changeEvent("price_changed", from, to, date));
  }
  if (from.cycleName !== to.cycleName || from.frequency !== to.frequency) {
    events.push(changeEvent("cycle_changed", from, to, date));
  }
  if (from.currency !== to.currency) {
    events.push(changeEvent("currency_changed", from, to, date));
  }
  if (from.inactive !== to.inactive) {
    events.push(changeEvent(to.inactive ? "paused" : "resumed", from, to, date));
  }

  return events;
}

function isTimelineEvent(event) {
  return TIMELINE_EVENTS.indexOf(String(event && event.event_type)) !== -1;
}

function byEffectiveDate(a, b) {
  var left = limits.dateOnly(a.effective_date);
  var right = limits.dateOnly(b.effective_date);
  if (left < right) return -1;
  if (left > right) return 1;
  return 0;
}

/**
 * Folds the stored events into the price segments they describe.
 *
 * Each segment is "from this date on, the subscription cost `price` every
 * `frequency` `cycleName`". A segment inherits whatever the previous one had
 * for any value the event did not carry, which is what makes a price-only
 * change keep the cycle it was billed on.
 *
 * `fallback` supplies the current subscription state, used when the log has no
 * timeline events at all (a subscription created before the log existed and
 * never backfilled) — the only price we can honestly attribute to the past is
 * the one it has now.
 */
function buildPriceTimeline(events, fallback) {
  var current = normalizeSnapshot(fallback);
  var relevant = (events || []).filter(isTimelineEvent).slice().sort(byEffectiveDate);
  var segments = [];

  for (var i = 0; i < relevant.length; i++) {
    var event = relevant[i];
    var from = limits.dateOnly(event.effective_date);
    if (!from) continue;

    var frequency = Math.floor(toNumber(event.new_frequency));
    current = {
      price: toNumber(event.new_price),
      cycleName: String(event.new_cycle || current.cycleName),
      frequency: frequency > 0 ? frequency : current.frequency,
      currency: String(event.new_currency || current.currency),
      inactive: current.inactive,
    };

    var previous = segments[segments.length - 1];
    if (previous && previous.from === from) {
      segments[segments.length - 1] = { from: from, price: current.price, cycleName: current.cycleName, frequency: current.frequency };
      continue;
    }

    segments.push({
      from: from,
      price: current.price,
      cycleName: current.cycleName,
      frequency: current.frequency,
    });
  }

  if (segments.length === 0) {
    var since = limits.dateOnly(fallback && fallback.since);
    if (!since) return [];
    return [
      {
        from: since,
        price: current.price,
        cycleName: current.cycleName,
        frequency: current.frequency,
      },
    ];
  }

  return segments;
}

/** The segment in force on `date`, or null when the timeline had not started. */
function segmentAt(segments, date) {
  var day = limits.dateOnly(date);
  var found = null;

  for (var i = 0; i < (segments || []).length; i++) {
    if (segments[i].from <= day) found = segments[i];
  }

  return found;
}

/**
 * The stretches during which the subscription was inactive.
 *
 * A paused subscription is not billed, so replaying its schedule straight
 * through a pause would invent payments that never happened. A range with an
 * empty `to` was never resumed: the subscription is still paused, and every
 * date from `from` onwards is unbilled.
 */
function buildPausedRanges(events) {
  var relevant = (events || [])
    .filter(function (event) {
      return event.event_type === "paused" || event.event_type === "resumed";
    })
    .slice()
    .sort(byEffectiveDate);
  var ranges = [];
  var open = "";

  for (var i = 0; i < relevant.length; i++) {
    var date = limits.dateOnly(relevant[i].effective_date);
    if (!date) continue;

    if (relevant[i].event_type === "paused") {
      if (!open) open = date;
      continue;
    }

    if (open) {
      ranges.push({ from: open, to: date });
      open = "";
    }
  }

  return open ? ranges.concat([{ from: open, to: "" }]) : ranges;
}

function isPausedOn(ranges, date) {
  for (var i = 0; i < ranges.length; i++) {
    // The pause day itself is unbilled; the day it resumes is billed again.
    if (ranges[i].from > date) continue;
    if (!ranges[i].to || date < ranges[i].to) return true;
  }
  return false;
}

/**
 * Replays the schedule from the start of the timeline up to `until`, charging
 * whichever price was in force on each occurrence.
 *
 * This is an estimate and is labelled as one in the UI: it assumes the
 * subscription was actually paid on schedule. Zublo only records real payments
 * when payment tracking is enabled, so for everyone else this is the only
 * number available — and for a subscription that never changed price it is
 * exactly `price × elapsed cycles`.
 *
 * A cycle that cannot advance (One-Time, or an unrecognised name) charges once
 * and stops, which is what a one-off payout should contribute.
 */
function computeSpendTotal(options) {
  var config = options || {};
  var segments = config.segments || [];
  var until = limits.dateOnly(config.until);
  var endDate = limits.dateOnly(config.endDate);
  var paymentLimit = limits.nonNegativeInteger(config.paymentLimit);
  var pausedRanges = config.pausedRanges || [];
  var advanceDate = config.advanceDate;
  var result = { total: 0, payments: 0, firstDate: "", lastDate: "" };

  if (segments.length === 0 || !until || !advanceDate) return result;

  var date = segments[0].from;
  var since = limits.dateOnly(config.since);
  if (since && since > date) date = since;
  var steps = 0;

  while (date <= until && steps < MAX_OCCURRENCES) {
    steps += 1;
    if (endDate && date > endDate) break;
    if (paymentLimit && result.payments >= paymentLimit) break;

    // Always resolves: the walk starts on the first segment's date and only
    // ever moves forward, so at least that segment is in force.
    var segment = segmentAt(segments, date);

    if (!isPausedOn(pausedRanges, date)) {
      result.total += segment.price;
      result.payments += 1;
      if (!result.firstDate) result.firstDate = date;
      result.lastDate = date;
    }

    var advanced = advanceDate(new Date(date + "T00:00:00.000Z"), segment.cycleName, segment.frequency);
    var next = limits.dateOnly(advanced && advanced.toISOString());
    if (!next || next <= date) break;

    date = next;
  }

  result.total = roundMoney(result.total);
  return result;
}

/**
 * Totals the payments the user actually confirmed.
 *
 * Older payment records were written without an amount, so those fall back to
 * the price the timeline says was in force on their due date rather than being
 * silently counted as zero.
 */
function summarizePaidRecords(records, segments) {
  var result = { total: 0, payments: 0, lastPaidDate: "" };

  for (var i = 0; i < (records || []).length; i++) {
    var record = records[i] || {};
    var paidAt = limits.dateOnly(record.paid_at);
    if (!String(record.paid_at || "")) continue;

    var amount = Number(record.amount);
    if (!isFinite(amount) || amount === 0) {
      var segment = segmentAt(segments, record.due_date);
      amount = segment ? segment.price : 0;
    }

    result.total += amount;
    result.payments += 1;
    if (paidAt > result.lastPaidDate) result.lastPaidDate = paidAt;
  }

  result.total = roundMoney(result.total);
  return result;
}

module.exports = {
  MAX_OCCURRENCES,
  TIMELINE_EVENTS,
  buildPausedRanges,
  buildPriceTimeline,
  computeSpendTotal,
  createdEvent,
  diffSubscriptionSnapshot,
  normalizeSnapshot,
  roundMoney,
  segmentAt,
  summarizePaidRecords,
};
