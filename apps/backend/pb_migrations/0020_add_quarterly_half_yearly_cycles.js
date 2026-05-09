/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0020 — Add Quarterly and Half-Yearly billing cycles.
 *
 * Previously, quarterly / half-yearly subscriptions were approximated with
 * Monthly cycle + frequency=3 or 6.  This migration promotes them to
 * first-class cycles with their own seed frequencies so the UI can offer
 * them as explicit options.
 *
 * Safe to run on existing installs: it skips cycle creation when the name
 * already exists, so re-running or deploying on a fresh instance is
 * idempotent.
 */

migrate(
  (app) => {
    const cyclesCol = app.findCollectionByNameOrId("cycles");
    const freqCol = app.findCollectionByNameOrId("frequencies");

    const newCycles = [
      {
        name: "Quarterly",
        frequencies: [
          { name: "Every quarter", value: 1 },
          { name: "Every 2 quarters", value: 2 },
          { name: "Every 3 quarters", value: 3 },
          { name: "Every 4 quarters", value: 4 },
        ],
      },
      {
        name: "Half-Yearly",
        frequencies: [
          { name: "Every half-year", value: 1 },
          { name: "Every year (half-yearly)", value: 2 },
        ],
      },
    ];

    for (const cycleDef of newCycles) {
      // Idempotency: skip if the cycle already exists
      const existing = app.findRecordsByFilter(
        "cycles", "name = {:name}", "", 1, 0, { name: cycleDef.name }
      );
      if (existing.length > 0) {
        console.log("[Zublo] Migration 0020: cycle '" + cycleDef.name + "' already exists, skipping.");
        continue;
      }

      const cycleRecord = new Record(cyclesCol);
      cycleRecord.set("name", cycleDef.name);
      app.save(cycleRecord);
      const cycleId = cycleRecord.id;

      for (const freq of cycleDef.frequencies) {
        const freqRecord = new Record(freqCol);
        freqRecord.set("name", freq.name);
        freqRecord.set("value", freq.value);
        freqRecord.set("cycle", cycleId);
        app.save(freqRecord);
      }

      console.log("[Zublo] Migration 0020: added cycle '" + cycleDef.name + "' with " + cycleDef.frequencies.length + " frequencies.");
    }
  },

  // DOWN — remove the cycles (and let cascade delete remove their frequencies)
  (app) => {
    for (const name of ["Quarterly", "Half-Yearly"]) {
      try {
        const records = app.findRecordsByFilter(
          "cycles", "name = {:name}", "", 1, 0, { name }
        );
        if (records.length > 0) {
          // Remove linked frequencies first to avoid foreign-key issues
          const freqs = app.findRecordsByFilter(
            "frequencies", "cycle = {:cid}", "", 0, 0, { cid: records[0].id }
          );
          for (const f of freqs) app.delete(f);
          app.delete(records[0]);
        }
      } catch (_) {}
    }
  }
);
