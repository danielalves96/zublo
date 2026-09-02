/// <reference path="../pb_data/types.d.ts" />

/**
 * Subscription history — an append-only log of what changed on a subscription.
 *
 * Zublo only ever stored the *current* shape of a subscription, so a price
 * raise silently overwrote the old price and the money already spent became
 * unknowable. This collection keeps the previous values around: every write
 * path is diffed (see pb_hooks/subscription_history.pb.js) and the resulting
 * events are what `/api/subscription/history` replays to reconstruct the
 * price timeline and the amount spent since the subscription started.
 *
 * `subscription_id` is a plain text field rather than a relation, matching
 * payment_records: the log is written from hooks that already hold the id, and
 * a relation would drag cascade semantics into a table that is cleaned up
 * explicitly when its subscription is deleted.
 *
 * Existing subscriptions are backfilled with a single `created` event so their
 * timeline starts somewhere. That event necessarily assumes the current price
 * has always applied — it is the only price the database ever kept — which is
 * exactly what the totals would have assumed anyway.
 */
migrate(
  (app) => {
    let alreadyExists = false;
    try {
      app.findCollectionByNameOrId("subscription_history");
      alreadyExists = true;
    } catch (_) {}

    if (!alreadyExists) {
      // ── Phase 1: create without relations or rules ──────────────────────
      app.save(
        new Collection({
          name: "subscription_history",
          type: "base",
          // Field *instances* are not picked up by the Collection constructor
          // in this PocketBase version — migration 0008 did that and 0009 had
          // to repair the half-created table. Plain descriptors, as in 0001.
          fields: [
            { type: "text", name: "subscription_id", required: true },
            {
              type: "select",
              name: "event_type",
              required: true,
              maxSelect: 1,
              values: [
                "created",
                "price_changed",
                "cycle_changed",
                "currency_changed",
                "paused",
                "resumed",
              ],
            },
            // YYYY-MM-DD: the calendar day the change takes effect from, which
            // is what the price timeline is keyed on.
            { type: "text", name: "effective_date", required: true },
            { type: "number", name: "old_price" },
            { type: "number", name: "new_price" },
            { type: "text", name: "old_cycle" },
            { type: "text", name: "new_cycle" },
            { type: "number", name: "old_frequency" },
            { type: "number", name: "new_frequency" },
            { type: "text", name: "old_currency" },
            { type: "text", name: "new_currency" },
            { type: "text", name: "note" },
            // Zublo's collections predate PocketBase's implicit timestamps, so
            // the log declares its own: two changes on the same effective date
            // must still read back in the order they happened.
            { type: "autodate", name: "created", onCreate: true, onUpdate: false },
          ],
        }),
      );

      // ── Phase 2: add the owner relation ─────────────────────────────────
      const users = app.findCollectionByNameOrId("users");
      const withRelation = app.findCollectionByNameOrId("subscription_history");
      withRelation.fields.add(
        new RelationField({
          name: "user",
          required: true,
          collectionId: users.id,
          maxSelect: 1,
          cascadeDelete: true,
        }),
      );
      app.save(withRelation);

      // ── Phase 3: read-only for owners, written only by hooks ────────────
      // Hook writes go through $app/e.app and bypass API rules, so leaving
      // create/update/delete closed keeps the log append-only from outside.
      const withRules = app.findCollectionByNameOrId("subscription_history");
      const ownerRule = "@request.auth.id != '' && user = @request.auth.id";
      withRules.listRule = ownerRule;
      withRules.viewRule = ownerRule;
      withRules.createRule = null;
      withRules.updateRule = null;
      withRules.deleteRule = null;
      app.save(withRules);
    }

    // ── Backfill one `created` event per existing subscription ────────────
    const collection = app.findCollectionByNameOrId("subscription_history");
    const subscriptions = app.findRecordsByFilter("subscriptions", "id != ''", "", 0, 0, {});

    for (const sub of subscriptions) {
      const existing = app.findRecordsByFilter(
        "subscription_history",
        "subscription_id = {:id}",
        "",
        1,
        0,
        { id: sub.id },
      );
      if (existing.length > 0) continue;

      let cycleName = "";
      try {
        cycleName = app.findRecordById("cycles", sub.get("cycle")).get("name") || "";
      } catch (_) {}

      let currencyCode = "";
      try {
        currencyCode = app.findRecordById("currencies", sub.get("currency")).get("code") || "";
      } catch (_) {}

      const startDate = String(sub.get("start_date") || "").slice(0, 10);
      const nextPayment = String(sub.get("next_payment") || "").slice(0, 10);
      const created = String(sub.get("created") || "").slice(0, 10);
      const effectiveDate = startDate || created || nextPayment;
      if (!effectiveDate) continue;

      const event = new Record(collection);
      event.set("subscription_id", sub.id);
      event.set("user", sub.get("user"));
      event.set("event_type", "created");
      event.set("effective_date", effectiveDate);
      event.set("new_price", sub.get("price"));
      event.set("new_cycle", cycleName);
      event.set("new_frequency", sub.get("frequency") || 1);
      event.set("new_currency", currencyCode);
      event.set("note", "backfilled");
      app.save(event);
    }
  },
  (app) => {
    try {
      app.delete(app.findCollectionByNameOrId("subscription_history"));
    } catch (_) {}
  },
);
