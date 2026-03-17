/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0006 — Granular notification reminders
 *
 * Replaces the flat *_days_before fields with a single `reminders` JSON array:
 *   [{ days: number, hour: number }, ...]
 *   e.g. [{ days: 3, hour: 9 }, { days: 0, hour: 13 }]
 *
 * Also creates the `notification_log` collection used for send deduplication.
 */
migrate(
  (app) => {
    // 1. Remove all *_days_before + email_address alias from notifications_config
    //    and add the new reminders JSON field
    const nc = app.findCollectionByNameOrId("notifications_config");
    const toRemove = [
      "days_before", "email_days_before", "email_address",
      "discord_days_before", "telegram_days_before", "gotify_days_before",
      "pushover_days_before", "ntfy_days_before", "webhook_days_before",
      "pushplus_days_before", "mattermost_days_before", "serverchan_days_before",
    ];
    nc.fields = nc.fields.filter((f) => !toRemove.includes(f.name));
    nc.fields.add(new JSONField({ name: "reminders", required: false }));
    app.save(nc);

    // 2. Create notification_log for send deduplication
    const authOnly = "@request.auth.id != ''";
    app.save(new Collection({
      name: "notification_log", type: "base",
      listRule: authOnly, viewRule: authOnly,
      createRule: authOnly, updateRule: null,
      deleteRule: authOnly,
      fields: [
        { type: "text", name: "subscription_id", required: true },
        { type: "text", name: "user_id", required: true },
        { type: "text", name: "reminder_key", required: true },
        { type: "text", name: "sent_date", required: true },
      ],
    }));
  },
  (app) => {
    // Rollback: restore *_days_before fields
    const nc = app.findCollectionByNameOrId("notifications_config");
    nc.fields = nc.fields.filter((f) => f.name !== "reminders");
    const restore = [
      new NumberField({ name: "days_before" }),
      new NumberField({ name: "email_days_before" }),
      new TextField({ name: "email_address" }),
      new NumberField({ name: "discord_days_before" }),
      new NumberField({ name: "telegram_days_before" }),
      new NumberField({ name: "gotify_days_before" }),
      new NumberField({ name: "pushover_days_before" }),
      new NumberField({ name: "ntfy_days_before" }),
      new NumberField({ name: "webhook_days_before" }),
      new NumberField({ name: "pushplus_days_before" }),
      new NumberField({ name: "mattermost_days_before" }),
      new NumberField({ name: "serverchan_days_before" }),
    ];
    for (const f of restore) nc.fields.add(f);
    app.save(nc);

    try {
      const col = app.findCollectionByNameOrId("notification_log");
      app.delete(col);
    } catch (_) {}
  }
);
