/// <reference path="../pb_data/types.d.ts" />

/**
 * Zublo — Subscription History Hooks
 *
 * Turns every subscription write into an append-only log of what changed, so
 * a price raise stops being invisible and the amount spent since the start can
 * be reconstructed. See lib/subscription-history.js for the write logic and
 * lib/pure/subscription-history.js for the diff/total math.
 *
 * These are the *before* hooks (onRecordCreate/onRecordUpdate) rather than the
 * AfterSuccess variants for one reason: record.original() only holds the
 * previous values until the save runs, and comparing against it is the entire
 * point. The save itself is performed by e.next(), so the log is written from
 * inside the same transaction and cannot describe an update that was rolled
 * back.
 *
 * NOTE: In PocketBase JSVM (Goja), file-scope bindings are not reliably
 * available inside hook callbacks — every helper is required in-callback.
 */

onRecordCreate((e) => {
  const history = require(__hooks + "/lib/subscription-history.js");

  e.next();
  history.logCreated(e.app, e.record);
}, "subscriptions");

onRecordUpdate((e) => {
  const history = require(__hooks + "/lib/subscription-history.js");

  const before = history.snapshotFromRecord(e.app, e.record.original());
  e.next();
  history.logChanges(e.app, e.record, before);
}, "subscriptions");

onRecordDelete((e) => {
  const history = require(__hooks + "/lib/subscription-history.js");

  e.next();
  history.deleteForSubscription(e.app, e.record.id);
}, "subscriptions");
