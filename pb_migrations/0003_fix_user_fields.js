/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0003 — Fix user fields
 *
 * Issues found:
 * - Missing display-preference boolean fields
 * - dark_theme stored as bool but frontend expects 0/1/2 (number)
 * - monthly_budget vs budget naming mismatch
 * - totp_enabled vs two_factor_enabled naming mismatch
 * - Missing: monthly_price, show_original_price, hide_disabled,
 *            disabled_to_bottom, subscription_progress, mobile_navigation,
 *            remove_background, budget, totp_enabled
 */
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId("users");

    const boolFields = [
      "monthly_price",
      "show_original_price",
      "hide_disabled",
      "disabled_to_bottom",
      "subscription_progress",
      "mobile_navigation",
      "remove_background",
      "totp_enabled",
    ];

    for (const name of boolFields) {
      // skip if already exists
      let exists = false;
      for (const f of users.fields) {
        if (f.name === name) { exists = true; break; }
      }
      if (!exists) {
        users.fields.add(new BoolField({ name, required: false }));
      }
    }

    // budget (number) — monthly budget for the user
    let budgetExists = false;
    for (const f of users.fields) {
      if (f.name === "budget") { budgetExists = true; break; }
    }
    if (!budgetExists) {
      users.fields.add(new NumberField({ name: "budget", required: false }));
    }

    // dark_theme_mode (number 0=light 1=dark 2=system) — rename to avoid
    // conflict with the existing bool dark_theme field
    let dtModeExists = false;
    for (const f of users.fields) {
      if (f.name === "dark_theme_mode") { dtModeExists = true; break; }
    }
    if (!dtModeExists) {
      users.fields.add(new NumberField({ name: "dark_theme_mode", required: false, min: 0, max: 2 }));
    }

    // totp_secret already exists (two_factor_secret or totp_secret)
    app.save(users);
  },
  (app) => {
    // rollback: remove added fields
    const users = app.findCollectionByNameOrId("users");
    const toRemove = [
      "monthly_price", "show_original_price", "hide_disabled",
      "disabled_to_bottom", "subscription_progress", "mobile_navigation",
      "remove_background", "totp_enabled", "budget", "dark_theme_mode",
    ];
    users.fields = users.fields.filter((f) => !toRemove.includes(f.name));
    app.save(users);
  }
);
