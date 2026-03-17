/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0010 — Move auto_mark_paid from users to subscriptions
 *
 * 1. Add auto_mark_paid (bool) to subscriptions
 * 2. Copy each user's auto_mark_paid value to all their subscriptions
 * 3. Remove auto_mark_paid from users
 */
migrate(
  (app) => {
    // ── 1. Add field to subscriptions ────────────────────────────────────────
    const subs = app.findCollectionByNameOrId("subscriptions");

    let exists = false;
    for (const f of subs.fields) {
      if (f.name === "auto_mark_paid") { exists = true; break; }
    }
    if (!exists) {
      subs.fields.add(new BoolField({ name: "auto_mark_paid", required: false }));
      app.save(subs);
    }

    // ── 2. Copy user value to their subscriptions ────────────────────────────
    const users = app.findAllRecords("users");
    for (const user of users) {
      if (!user.getBool("auto_mark_paid")) continue;

      const userSubs = app.findRecordsByFilter(
        "subscriptions",
        "user = {:uid}",
        "", 0, 0,
        { uid: user.id }
      );
      for (const sub of userSubs) {
        sub.set("auto_mark_paid", true);
        app.save(sub);
      }
    }

    // ── 3. Remove field from users ───────────────────────────────────────────
    const usersCol = app.findCollectionByNameOrId("users");
    try { usersCol.fields.removeByName("auto_mark_paid"); } catch (_) {}
    app.save(usersCol);
  },
  (app) => {
    // Rollback: add field back to users, remove from subscriptions
    const usersCol = app.findCollectionByNameOrId("users");
    let exists = false;
    for (const f of usersCol.fields) {
      if (f.name === "auto_mark_paid") { exists = true; break; }
    }
    if (!exists) {
      usersCol.fields.add(new BoolField({ name: "auto_mark_paid", required: false }));
      app.save(usersCol);
    }

    const subsCol = app.findCollectionByNameOrId("subscriptions");
    try { subsCol.fields.removeByName("auto_mark_paid"); } catch (_) {}
    app.save(subsCol);
  }
);
