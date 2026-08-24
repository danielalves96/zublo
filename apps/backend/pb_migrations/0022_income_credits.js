/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0022 — Income credits and one-time payouts.
 *
 * The field stays optional at the database level and existing rows are left
 * untouched: every read path normalizes an empty record_type to "expense"
 * (see pb_hooks/lib/pure/record-types.js), so a backfill would rewrite every
 * subscription row to make an already-implicit default explicit.
 *
 * The One-Time cycle it adds is reserved for credits — an expense on that
 * cycle has no recurring monthly equivalent and would be counted as a
 * perpetual monthly charge.  That pairing is enforced on every write path.
 */
migrate(
  (app) => {
    const subscriptions = app.findCollectionByNameOrId("subscriptions");
    let hasRecordType = false;
    for (const field of subscriptions.fields) {
      if (field.name === "record_type") {
        hasRecordType = true;
        break;
      }
    }

    if (!hasRecordType) {
      subscriptions.fields.add(
        new SelectField({
          name: "record_type",
          required: false,
          maxSelect: 1,
          values: ["expense", "credit"],
        }),
      );
      app.save(subscriptions);
    }

    const existingCycles = app.findRecordsByFilter(
      "cycles",
      "name = {:name}",
      "",
      1,
      0,
      { name: "One-Time" },
    );
    if (existingCycles.length === 0) {
      const cycles = app.findCollectionByNameOrId("cycles");
      const frequencies = app.findCollectionByNameOrId("frequencies");
      const cycle = new Record(cycles);
      cycle.set("name", "One-Time");
      app.save(cycle);

      const frequency = new Record(frequencies);
      frequency.set("name", "Once");
      frequency.set("value", 1);
      frequency.set("cycle", cycle.id);
      app.save(frequency);
    }
  },
  (app) => {
    try {
      const oneTimeCycles = app.findRecordsByFilter(
        "cycles",
        "name = {:name}",
        "",
        1,
        0,
        { name: "One-Time" },
      );
      if (oneTimeCycles.length > 0) {
        const frequencies = app.findRecordsByFilter(
          "frequencies",
          "cycle = {:cycleId}",
          "",
          0,
          0,
          { cycleId: oneTimeCycles[0].id },
        );
        for (const frequency of frequencies) app.delete(frequency);
        app.delete(oneTimeCycles[0]);
      }
    } catch (_) {}

    const subscriptions = app.findCollectionByNameOrId("subscriptions");
    try {
      subscriptions.fields.removeByName("record_type");
    } catch (_) {}
    app.save(subscriptions);
  },
);
