var historyLibBase = typeof __hooks !== "undefined" ? __hooks + "/lib" : __dirname;
var historyMath = require(historyLibBase + "/pure/subscription-history.js");
var historyDates = require(historyLibBase + "/date-helpers.js");
var historyLimits = require(historyLibBase + "/pure/subscription-limits.js");

/**
 * Database-facing half of the subscription history feature.
 *
 * The hooks in pb_hooks/subscription_history.pb.js call in here on every
 * subscription write; `/api/subscription/history` calls in here to read the
 * log back. All money math lives in lib/pure/subscription-history.js.
 *
 * Every write path is failure-tolerant on purpose: the log is bookkeeping, so
 * a broken history write must never roll back the subscription save that
 * triggered it.
 */

function relatedName(app, collection, id, field) {
  if (!id) return "";
  try {
    return String(app.findRecordById(collection, String(id)).get(field) || "");
  } catch (_) {
    return "";
  }
}

/** The five values a history event is diffed on, resolved to plain data. */
function snapshotFromRecord(app, record) {
  if (!record) return null;

  return {
    price: record.get("price"),
    cycleName: relatedName(app, "cycles", record.get("cycle"), "name"),
    frequency: record.get("frequency"),
    currency: relatedName(app, "currencies", record.get("currency"), "code"),
    inactive: !!record.get("inactive"),
  };
}

function today() {
  return historyDates.formatLocalDate(new Date());
}

function writeEvents(app, subscription, events) {
  var collection = app.findCollectionByNameOrId("subscription_history");

  for (var i = 0; i < events.length; i++) {
    var event = events[i];
    var record = new Record(collection);
    record.set("subscription_id", subscription.id);
    record.set("user", subscription.get("user"));
    record.set("event_type", event.event_type);
    record.set("effective_date", event.effective_date);
    record.set("old_price", event.old_price);
    record.set("new_price", event.new_price);
    record.set("old_cycle", event.old_cycle);
    record.set("new_cycle", event.new_cycle);
    record.set("old_frequency", event.old_frequency);
    record.set("new_frequency", event.new_frequency);
    record.set("old_currency", event.old_currency);
    record.set("new_currency", event.new_currency);
    app.save(record);
  }
}

/**
 * Opens the timeline for a freshly created subscription.
 *
 * The event is dated from start_date when there is one, so a subscription
 * entered after the fact still totals the payments it already made. Otherwise
 * the first scheduled payment is the earliest date any money could move.
 */
function logCreated(app, record) {
  try {
    var startDate = historyLimits.dateOnly(record.get("start_date"));
    var nextPayment = historyLimits.dateOnly(record.get("next_payment"));
    var event = historyMath.createdEvent(
      snapshotFromRecord(app, record),
      startDate || nextPayment || today(),
    );
    writeEvents(app, record, [event]);
  } catch (error) {
    console.log("[Zublo] subscription history (create) failed for " + record.id + ":", error);
  }
}

/**
 * Logs whatever changed between the record as loaded and the record as saved.
 * `before` comes from snapshotFromRecord() called on record.original() *before*
 * the save, which is the only point the previous values are still readable.
 */
function logChanges(app, record, before) {
  try {
    var events = historyMath.diffSubscriptionSnapshot(
      before,
      snapshotFromRecord(app, record),
      today(),
    );
    if (events.length === 0) return;
    writeEvents(app, record, events);
  } catch (error) {
    console.log("[Zublo] subscription history (update) failed for " + record.id + ":", error);
  }
}

/** History is meaningless without its subscription, so it goes with it. */
function deleteForSubscription(app, subscriptionId) {
  try {
    var events = app.findRecordsByFilter(
      "subscription_history",
      "subscription_id = {:id}",
      "",
      0,
      0,
      { id: subscriptionId },
    );
    for (var i = 0; i < events.length; i++) app.delete(events[i]);
  } catch (error) {
    console.log("[Zublo] subscription history (delete) failed for " + subscriptionId + ":", error);
  }
}

function listForSubscription(app, subscriptionId) {
  var records = app.findRecordsByFilter(
    "subscription_history",
    "subscription_id = {:id}",
    "effective_date,created",
    0,
    0,
    { id: subscriptionId },
  );
  var events = [];

  for (var i = 0; i < records.length; i++) {
    var record = records[i];
    events.push({
      id: record.id,
      event_type: record.get("event_type"),
      effective_date: historyLimits.dateOnly(record.get("effective_date")),
      old_price: record.get("old_price"),
      new_price: record.get("new_price"),
      old_cycle: record.get("old_cycle"),
      new_cycle: record.get("new_cycle"),
      old_frequency: record.get("old_frequency"),
      new_frequency: record.get("new_frequency"),
      old_currency: record.get("old_currency"),
      new_currency: record.get("new_currency"),
      note: record.get("note"),
      created: String(record.get("created") || ""),
    });
  }

  return events;
}

function paidRecordsFor(app, subscriptionId, userId) {
  try {
    var records = app.findRecordsByFilter(
      "payment_records",
      "subscription_id = {:id} && user = {:user}",
      "due_date",
      0,
      0,
      { id: subscriptionId, user: userId },
    );
    var rows = [];
    for (var i = 0; i < records.length; i++) {
      rows.push({
        due_date: records[i].get("due_date"),
        paid_at: records[i].get("paid_at"),
        amount: records[i].get("amount"),
      });
    }
    return rows;
  } catch (_) {
    return [];
  }
}

/**
 * Everything `/api/subscription/history` returns: the raw log, plus the two
 * totals the log makes possible.
 *
 * `estimated` replays the schedule against the price timeline; `paid` sums the
 * payments the user confirmed. They are reported side by side rather than
 * merged because they answer different questions, and only the first one
 * exists when payment tracking is off.
 */
function buildHistoryResponse(app, subscription) {
  var events = listForSubscription(app, subscription.id);
  var snapshot = snapshotFromRecord(app, subscription);
  var startDate = historyLimits.dateOnly(subscription.get("start_date"));
  var cancellationDate = historyLimits.dateOnly(subscription.get("cancellation_date"));
  var endDate = historyLimits.dateOnly(subscription.get("end_date"));
  var todayStr = today();

  var segments = historyMath.buildPriceTimeline(events, {
    price: snapshot.price,
    cycleName: snapshot.cycleName,
    frequency: snapshot.frequency,
    currency: snapshot.currency,
    since: startDate || historyLimits.dateOnly(subscription.get("next_payment")),
  });

  // A cancelled subscription stopped charging on its cancellation date; every
  // other one is charged up to today.
  var until = cancellationDate && cancellationDate < todayStr ? cancellationDate : todayStr;

  var estimated = historyMath.computeSpendTotal({
    segments: segments,
    until: until,
    endDate: endDate,
    paymentLimit: subscription.get("payment_limit"),
    // A subscription is not billed while it is paused, so those stretches are
    // skipped instead of being replayed as payments that never happened.
    pausedRanges: historyMath.buildPausedRanges(events),
    advanceDate: historyDates.advanceDate,
  });

  var paid = historyMath.summarizePaidRecords(
    paidRecordsFor(app, subscription.id, subscription.get("user")),
    segments,
  );

  return {
    subscription: {
      id: subscription.id,
      name: subscription.get("name"),
      record_type: subscription.get("record_type") || "expense",
      currency: snapshot.currency,
      currency_symbol: relatedName(app, "currencies", subscription.get("currency"), "symbol"),
      cycle: snapshot.cycleName,
      frequency: snapshot.frequency,
      price: snapshot.price,
    },
    events: events,
    timeline: segments,
    totals: {
      since: segments.length > 0 ? segments[0].from : "",
      until: until,
      estimated_total: estimated.total,
      estimated_payments: estimated.payments,
      last_estimated_date: estimated.lastDate,
      paid_total: paid.total,
      paid_payments: paid.payments,
      last_paid_date: paid.lastPaidDate,
    },
  };
}

module.exports = {
  buildHistoryResponse,
  deleteForSubscription,
  listForSubscription,
  logChanges,
  logCreated,
  snapshotFromRecord,
  writeEvents,
};
