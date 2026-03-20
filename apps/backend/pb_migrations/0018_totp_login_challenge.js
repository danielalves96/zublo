/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0018 — Add ephemeral TOTP login challenge fields to users.
 *
 * These fields store only a short-lived hashed challenge during the second
 * factor login flow. They are hidden from API responses and cleared after use.
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    let hasHash = false;
    let hasExpires = false;

    for (const field of users.fields) {
      if (field.name === "totp_login_challenge_hash") {
        hasHash = true;
        field.hidden = true;
      }
      if (field.name === "totp_login_challenge_expires") {
        hasExpires = true;
        field.hidden = true;
      }
    }

    if (!hasHash) {
      users.fields.add(new TextField({
        name: "totp_login_challenge_hash",
        required: false,
        hidden: true,
      }));
    }

    if (!hasExpires) {
      users.fields.add(new DateField({
        name: "totp_login_challenge_expires",
        required: false,
        hidden: true,
      }));
    }

    app.save(users);
  },
  (app) => {
    const users = app.findCollectionByNameOrId("users");
    users.fields = users.fields.filter((field) => (
      field.name !== "totp_login_challenge_hash"
      && field.name !== "totp_login_challenge_expires"
    ));
    app.save(users);
  }
);
