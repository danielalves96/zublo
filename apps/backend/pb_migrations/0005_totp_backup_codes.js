/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0005 — Add totp_backup_codes to users
 *
 * Stores up to 8 single-use backup codes (JSON array of strings) so users
 * can still access their account if they lose their authenticator device.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    let exists = false;
    for (const f of users.fields) {
      if (f.name === "totp_backup_codes") { exists = true; break; }
    }

    if (!exists) {
      users.fields.add(new TextField({ name: "totp_backup_codes", required: false }));
      app.save(users);
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields = users.fields.filter((f) => f.name !== "totp_backup_codes");
    app.save(users);
  }
);
