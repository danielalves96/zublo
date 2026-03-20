/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0019 — Remove unused admin webhook allowlist field.
 *
 * The UI and runtime support for this setting were intentionally removed.
 * Keep 0004 intact as history and remove the field forward-only.
 */
migrate(
  (app) => {
    const adminSettings = app.findCollectionByNameOrId("admin_settings");
    adminSettings.fields = adminSettings.fields.filter(
      (field) => field.name !== "webhook_allowlist_csv",
    );
    app.save(adminSettings);
  },
  (app) => {
    const adminSettings = app.findCollectionByNameOrId("admin_settings");

    let exists = false;
    for (const field of adminSettings.fields) {
      if (field.name === "webhook_allowlist_csv") {
        exists = true;
        break;
      }
    }

    if (!exists) {
      adminSettings.fields.add(new TextField({ name: "webhook_allowlist_csv" }));
      app.save(adminSettings);
    }
  },
);
