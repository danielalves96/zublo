/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0012 — Multi-key API key system
 *
 * Creates the `api_keys` collection that replaces the single `api_key` field
 * on `users`. Keys are stored as SHA-256 hashes; only the prefix is ever
 * persisted in plain text so listing keys is safe.
 */

migrate(
  (app) => {
    // Create collection (no relation fields yet — Phase 1)
    const apiKeys = new Collection({
      name: "api_keys",
      type: "base",
      // All access goes through custom routes — PocketBase CRUD is locked down.
      listRule: null,
      viewRule: null,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { type: "text", name: "name", required: true },
        // SHA-256 of the raw key — never the key itself
        { type: "text", name: "key_hash", required: true },
        // e.g. "wk_a1b2c3d4e5..." — safe to display in the UI
        { type: "text", name: "key_prefix", required: true },
        // JSON array string: ["subscriptions:read", "calendar:read", ...]
        { type: "text", name: "permissions" },
        { type: "date", name: "last_used_at" },
      ],
    });
    app.save(apiKeys);

    // Phase 2 — Add relation to users (cascade-delete so keys die with the user)
    const usersCol = app.findCollectionByNameOrId("users");
    const apiKeysCol = app.findCollectionByNameOrId("api_keys");
    apiKeysCol.fields.add(new RelationField({
      name: "user",
      collectionId: usersCol.id,
      required: true,
      cascadeDelete: true,
    }));
    app.save(apiKeysCol);

    console.log("[Zublo] Migration 0012: api_keys collection created");
  },

  // DOWN
  (app) => {
    try {
      const col = app.findCollectionByNameOrId("api_keys");
      app.delete(col);
    } catch (_) {}
  }
);
