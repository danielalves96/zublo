/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0004 — Schema gaps
 *
 * Adds fields that the frontend needs but are missing from the schema:
 * - notifications_config: per-provider days_before + email_address alias
 * - payment_methods: order field (drag-reorder)
 * - admin_settings: max_users, require_email_validation, server_url,
 *                   oidc_enabled, webhook_allowlist
 */
migrate(
  (app) => {
    // ── notifications_config: days_before per provider + email_address ────
    const nc = app.findCollectionByNameOrId("notifications_config");
    const ncFields = [
      new NumberField({ name: "days_before", required: false }),           // global default
      new NumberField({ name: "email_days_before", required: false }),
      new TextField({ name: "email_address" }),                            // alias of email_to
      new NumberField({ name: "discord_days_before", required: false }),
      new NumberField({ name: "telegram_days_before", required: false }),
      new NumberField({ name: "gotify_days_before", required: false }),
      new NumberField({ name: "pushover_days_before", required: false }),
      new NumberField({ name: "ntfy_days_before", required: false }),
      new NumberField({ name: "webhook_days_before", required: false }),
      new NumberField({ name: "pushplus_days_before", required: false }),
      new NumberField({ name: "mattermost_days_before", required: false }),
      new NumberField({ name: "serverchan_days_before", required: false }),
    ];
    for (const f of ncFields) {
      let exists = false;
      for (const ef of nc.fields) { if (ef.name === f.name) { exists = true; break; } }
      if (!exists) nc.fields.add(f);
    }
    app.save(nc);

    // ── payment_methods: order ────────────────────────────────────────────
    const pm = app.findCollectionByNameOrId("payment_methods");
    let orderExists = false;
    for (const f of pm.fields) { if (f.name === "order") { orderExists = true; break; } }
    if (!orderExists) pm.fields.add(new NumberField({ name: "order", required: false }));
    app.save(pm);

    // ── admin_settings: missing fields ───────────────────────────────────
    const as = app.findCollectionByNameOrId("admin_settings");
    const asFields = [
      new NumberField({ name: "max_users", required: false, min: 0 }),
      new BoolField({ name: "require_email_validation", required: false }),
      new TextField({ name: "server_url" }),
      new BoolField({ name: "oidc_enabled", required: false }),
      new TextField({ name: "oidc_provider_name" }),
      new TextField({ name: "oidc_redirect_url" }),
      new TextField({ name: "webhook_allowlist_csv" }),                   // CSV stored as text
    ];
    for (const f of asFields) {
      let exists = false;
      for (const ef of as.fields) { if (ef.name === f.name) { exists = true; break; } }
      if (!exists) as.fields.add(f);
    }
    app.save(as);
  },
  (app) => {
    // rollback
    const ncRemove = ["days_before", "email_days_before", "email_address", "discord_days_before",
      "telegram_days_before", "gotify_days_before", "pushover_days_before", "ntfy_days_before",
      "webhook_days_before", "pushplus_days_before", "mattermost_days_before", "serverchan_days_before"];
    const nc = app.findCollectionByNameOrId("notifications_config");
    nc.fields = nc.fields.filter((f) => !ncRemove.includes(f.name));
    app.save(nc);

    const pm = app.findCollectionByNameOrId("payment_methods");
    pm.fields = pm.fields.filter((f) => f.name !== "order");
    app.save(pm);

    const asRemove = ["max_users", "require_email_validation", "server_url", "oidc_enabled",
      "oidc_provider_name", "oidc_redirect_url", "webhook_allowlist_csv"];
    const as = app.findCollectionByNameOrId("admin_settings");
    as.fields = as.fields.filter((f) => !asRemove.includes(f.name));
    app.save(as);
  }
);
