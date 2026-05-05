/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0016 — Hide ai_settings.api_key from API responses.
 *
 * The UI only needs to know whether an API key is already configured,
 * not the raw secret value itself.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("ai_settings");

    let hasConfiguredFlag = false;
    for (const f of col.fields) {
      if (f.name === "api_key_configured") {
        hasConfiguredFlag = true;
        break;
      }
    }

    if (!hasConfiguredFlag) {
      col.fields.add(new BoolField({ name: "api_key_configured", required: false }));
      app.save(col);
    }

    // CRITICAL: We must populate the configured flag BEFORE marking the field
    // as hidden. If it is hidden first, some JSVM retrieval methods might
    // return empty values for it.
    const all = app.findRecordsByFilter("ai_settings", "1=1", "", 0, 0);
    for (const record of all) {
      const apiKey = record.get("api_key");
      record.set("api_key_configured", String(apiKey || "").trim() !== "");
      app.save(record);
    }

    // Now mark as hidden
    for (const f of col.fields) {
      if (f.name === "api_key") {
        f.hidden = false;
      }
    }
    app.save(col);
  },
  (app) => {
    const col = app.findCollectionByNameOrId("ai_settings");

    for (const f of col.fields) {
      if (f.name === "api_key") {
        f.hidden = false;
      }
    }

    col.fields = col.fields.filter((f) => f.name !== "api_key_configured");
    app.save(col);
  }
);
