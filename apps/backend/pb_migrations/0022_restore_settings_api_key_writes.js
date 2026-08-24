/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0022 — Restore API-key writes on upgraded installations.
 *
 * Migration 0017 originally marked fixer_settings.api_key as hidden. That was
 * later changed in-place, but PocketBase never reruns an already-applied
 * migration, so upgraded databases kept silently discarding keys submitted by
 * regular users. The field must be writable; security.pb.js hides it from every
 * public record serialization instead.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("fixer_settings");

    for (const field of col.fields) {
      if (field.name === "api_key") {
        field.hidden = false;
      }
    }

    // A user may only create a settings record that belongs to themselves.
    // Existing owner-scoped list/view/update/delete rules remain unchanged.
    col.createRule =
      "@request.auth.id != '' && @request.body.user = @request.auth.id";
    app.save(col);

    const records = app.findRecordsByFilter("fixer_settings", "1=1", "", 0, 0);
    for (const record of records) {
      record.set(
        "api_key_configured",
        String(record.get("api_key") || "").trim() !== "",
      );
      app.save(record);
    }
  },
  (app) => {
    const col = app.findCollectionByNameOrId("fixer_settings");

    for (const field of col.fields) {
      if (field.name === "api_key") {
        field.hidden = true;
      }
    }

    col.createRule = "@request.auth.id != ''";
    app.save(col);
  },
);
