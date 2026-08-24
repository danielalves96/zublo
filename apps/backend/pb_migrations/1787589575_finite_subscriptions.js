/// <reference path="../pb_data/types.d.ts" />

/**
 * Add optional finite schedules to subscriptions.
 *
 * Existing records keep all three fields empty/zero and therefore remain
 * infinite. `end_date` is deliberately separate from `cancellation_date`:
 * the latter describes an already-disabled subscription, while the former is
 * the inclusive date of the last scheduled payment.
 */
migrate(
  (app) => {
    const subscriptions = app.findCollectionByNameOrId("subscriptions");

    const hasField = (name) => {
      for (const field of subscriptions.fields) {
        if (field.name === name) return true;
      }
      return false;
    };

    if (!hasField("end_date")) {
      subscriptions.fields.add(new DateField({ name: "end_date", required: false }));
    }
    if (!hasField("payment_limit")) {
      subscriptions.fields.add(new NumberField({
        name: "payment_limit",
        required: false,
        min: 0,
        onlyInt: true,
      }));
    }
    if (!hasField("payments_completed")) {
      subscriptions.fields.add(new NumberField({
        name: "payments_completed",
        required: false,
        min: 0,
        onlyInt: true,
      }));
    }

    app.save(subscriptions);
  },
  (app) => {
    const subscriptions = app.findCollectionByNameOrId("subscriptions");
    for (const name of ["end_date", "payment_limit", "payments_completed"]) {
      try { subscriptions.fields.removeByName(name); } catch (_) {}
    }
    app.save(subscriptions);
  },
);
