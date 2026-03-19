/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0015 — Hide sensitive auth fields from auth responses.
 *
 * PocketBase returns the authenticated user record on auth-refresh/login.
 * These fields are secrets and should stay server-side.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    let hasTotpConfigured = false;
    for (const f of users.fields) {
      if (f.name === "totp_configured") {
        hasTotpConfigured = true;
        break;
      }
    }

    if (!hasTotpConfigured) {
      users.fields.add(new BoolField({ name: "totp_configured", required: false }));
    }

    const hiddenFieldNames = [
      "api_key",
      "two_factor_secret",
      "totp_secret",
      "totp_backup_codes",
    ];

    for (const f of users.fields) {
      if (hiddenFieldNames.includes(f.name)) {
        f.hidden = true;
      }
    }

    app.save(users);

    const allUsers = app.findRecordsByFilter("users", "1=1", "", 0, 0);
    for (const user of allUsers) {
      user.set("totp_configured", String(user.get("totp_secret") || "").trim() !== "");
      app.save(user);
    }
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    for (const f of users.fields) {
      if (
        f.name === "api_key" ||
        f.name === "two_factor_secret" ||
        f.name === "totp_secret" ||
        f.name === "totp_backup_codes"
      ) {
        f.hidden = false;
      }
    }

    users.fields = users.fields.filter((f) => f.name !== "totp_configured");
    app.save(users);
  }
);
