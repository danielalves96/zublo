/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0017 — Hide fixer_settings.api_key from API responses.
 *
 * The UI only needs to know whether a Fixer/APILayer key is configured.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("fixer_settings");

    let hasConfiguredFlag = false;
    for (const f of col.fields) {
      if (f.name === "api_key_configured") {
        hasConfiguredFlag = true;
        break;
      }
    }

    if (!hasConfiguredFlag) {
      col.fields.add(new BoolField({ name: "api_key_configured", required: false }));
    }

    for (const f of col.fields) {
      if (f.name === "api_key") {
        f.hidden = true;
      }
    }

    app.save(col);

    const all = app.findRecordsByFilter("fixer_settings", "1=1", "", 0, 0);
    for (const record of all) {
      record.set("api_key_configured", String(record.get("api_key") || "").trim() !== "");
      app.save(record);
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId("fixer_settings");

    for (const f of col.fields) {
      if (f.name === "api_key") {
        f.hidden = false;
      }
    }

    col.fields = col.fields.filter((f) => f.name !== "api_key_configured");
    app.save(col);
  }
);
