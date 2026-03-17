/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0008 — Payment Tracking
 *
 * - Adds payment_tracking (bool) and auto_mark_paid (bool) to users
 * - Creates payment_records collection
 *
 * Follows the same 3-phase pattern as 0001_create_schema.js:
 *   Phase 1: Create collection without relation fields (no rules)
 *   Phase 2: Add the user RelationField
 *   Phase 3: Apply owner-scoped access rules
 */
migrate(
  (app) => {
    // ── 1. User fields ──────────────────────────────────────────────────────
    const users = app.findCollectionByNameOrId("users");

    for (const name of ["payment_tracking", "auto_mark_paid"]) {
      let exists = false;
      for (const f of users.fields) {
        if (f.name === name) { exists = true; break; }
      }
      if (!exists) {
        users.fields.add(new BoolField({ name, required: false }));
      }
    }
    app.save(users);

    // ── 2. payment_records — Phase 1: create without relation or rules ───────
    let alreadyExists = false;
    try { app.findCollectionByNameOrId("payment_records"); alreadyExists = true; } catch (_) {}
    if (alreadyExists) return;

    const col = new Collection({
      name: "payment_records",
      type: "base",
      fields: [
        new TextField({    name: "subscription_id", required: true  }),
        new TextField({    name: "due_date",         required: true  }), // YYYY-MM-DD
        new TextField({    name: "paid_at",          required: false }),  // ISO datetime
        new BoolField({    name: "auto_paid",        required: false }),
        new NumberField({  name: "amount",           required: false }),
        new TextField({    name: "notes",            required: false }),
        new FileField({
          name: "proof",
          required: false,
          maxSelect: 1,
          maxSize: 15728640, // 15 MB
          mimeTypes: [
            "image/jpeg", "image/png", "image/webp", "image/gif",
            "application/pdf",
          ],
        }),
      ],
    });
    app.save(col);

    // ── Phase 2: add user RelationField (needs collection to exist first) ────
    const savedCol = app.findCollectionByNameOrId("payment_records");
    savedCol.fields.add(new RelationField({
      name: "user",
      required: true,
      collectionId: users.id,
      maxSelect: 1,
      cascadeDelete: true,
    }));
    app.save(savedCol);

    // ── Phase 3: apply access rules (relation field now registered) ──────────
    const ruleCol = app.findCollectionByNameOrId("payment_records");
    const ownerRule = "@request.auth.id != '' && user = @request.auth.id";
    ruleCol.listRule   = ownerRule;
    ruleCol.viewRule   = ownerRule;
    ruleCol.createRule = "@request.auth.id != ''";
    ruleCol.updateRule = ownerRule;
    ruleCol.deleteRule = ownerRule;
    app.save(ruleCol);
  },
  (app) => {
    // Rollback
    try {
      const col = app.findCollectionByNameOrId("payment_records");
      app.delete(col);
    } catch (_) {}

    const users = app.findCollectionByNameOrId("users");
    for (const name of ["payment_tracking", "auto_mark_paid"]) {
      try { users.fields.removeByName(name); } catch (_) {}
    }
    app.save(users);
  }
);
