/// <reference path="../pb_data/types.d.ts" />

/**
 * Zublo — Schema Migration
 *
 * Creates all 15 collections in three phases:
 *   Phase 1: Create collections without relation fields (permissive rules)
 *   Phase 2: Add relation fields (needs collectionId references)
 *   Phase 3: Apply owner-scoped access rules (fields now exist)
 */

migrate(
  (app) => {
    // ================================================================
    // PHASE 1 — Create base collections (no relations, permissive rules)
    // ================================================================

    // 1. cycles (read-only global data)
    const cycles = new Collection({
      name: "cycles",
      type: "base",
      listRule: "",
      viewRule: "",
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { type: "text", name: "name", required: true },
      ],
    });
    app.save(cycles);

    // 2. users — extend built-in auth collection
    const users = app.findCollectionByNameOrId("users");
    users.listRule = "id = @request.auth.id";
    users.viewRule = "id = @request.auth.id";
    users.createRule = "";
    users.updateRule = "id = @request.auth.id";
    users.deleteRule = "id = @request.auth.id";
    const userFields = [
      new TextField({ name: "language", max: 10 }),
      new BoolField({ name: "dark_theme" }),
      new TextField({ name: "display_currency", max: 20 }),
      new TextField({ name: "api_key" }),
      new BoolField({ name: "two_factor_enabled" }),
      new TextField({ name: "two_factor_secret" }),
      new TextField({ name: "totp_secret" }),
      new TextField({ name: "custom_css" }),
      new TextField({ name: "global_currency_prefix", max: 10 }),
      new BoolField({ name: "convert_currency" }),
      new NumberField({ name: "monthly_budget" }),
      new BoolField({ name: "show_logo_on_card" }),
      new BoolField({ name: "show_price_on_card" }),
      new BoolField({ name: "show_cycle_on_card" }),
      new BoolField({ name: "show_payment_method_on_card" }),
      new BoolField({ name: "show_category_on_card" }),
      new BoolField({ name: "show_payer_on_card" }),
      new BoolField({ name: "show_next_payment_on_card" }),
      new SelectField({ name: "sort_order", values: ["name", "price", "next_payment", "date_added", "category", "payment_method", "payer"] }),
      new TextField({ name: "sort_direction", max: 4 }),
      new TextField({ name: "calendar_view", max: 10 }),
    ];
    for (const f of userFields) users.fields.add(f);
    app.save(users);

    // 3. exchange_log
    app.save(new Collection({
      name: "exchange_log", type: "base",
      listRule: "@request.auth.id != ''", viewRule: "@request.auth.id != ''",
      createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { type: "date", name: "last_update" },
        { type: "text", name: "provider" },
        { type: "text", name: "status" },
      ],
    }));

    // 4. admin_settings (singleton, admin-only via null rules)
    app.save(new Collection({
      name: "admin_settings", type: "base",
      listRule: null, viewRule: null, createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { type: "bool", name: "open_registrations" },
        { type: "bool", name: "disable_login" },
        { type: "bool", name: "update_notification" },
        { type: "text", name: "latest_version" },
        { type: "text", name: "oidc_display_name" },
        { type: "text", name: "oidc_client_id" },
        { type: "text", name: "oidc_client_secret" },
        { type: "text", name: "oidc_issuer_url" },
        { type: "text", name: "oidc_redirect_uri" },
        { type: "text", name: "oidc_scopes" },
        { type: "text", name: "smtp_host" },
        { type: "number", name: "smtp_port" },
        { type: "text", name: "smtp_user" },
        { type: "text", name: "smtp_pass" },
        { type: "text", name: "smtp_email" },
        { type: "text", name: "smtp_from_name" },
        { type: "text", name: "smtp_encryption", max: 10 },
        { type: "bool", name: "smtp_enabled" },
      ],
    }));

    // 5-8: Per-user collections (start with auth-only rules, tightened in phase 3)
    const authOnly = "@request.auth.id != ''";

    app.save(new Collection({
      name: "currencies", type: "base",
      listRule: authOnly, viewRule: authOnly, createRule: authOnly,
      updateRule: authOnly, deleteRule: authOnly,
      fields: [
        { type: "text", name: "name", required: true },
        { type: "text", name: "symbol", required: true, max: 10 },
        { type: "text", name: "code", required: true, max: 3 },
        { type: "number", name: "rate" },
        { type: "bool", name: "is_main" },
      ],
    }));

    app.save(new Collection({
      name: "household", type: "base",
      listRule: authOnly, viewRule: authOnly, createRule: authOnly,
      updateRule: authOnly, deleteRule: authOnly,
      fields: [{ type: "text", name: "name", required: true }],
    }));

    app.save(new Collection({
      name: "categories", type: "base",
      listRule: authOnly, viewRule: authOnly, createRule: authOnly,
      updateRule: authOnly, deleteRule: authOnly,
      fields: [
        { type: "text", name: "name", required: true },
        { type: "number", name: "order" },
        { type: "text", name: "color", max: 7 },
      ],
    }));

    app.save(new Collection({
      name: "payment_methods", type: "base",
      listRule: authOnly, viewRule: authOnly, createRule: authOnly,
      updateRule: authOnly, deleteRule: authOnly,
      fields: [
        { type: "text", name: "name", required: true },
        { type: "file", name: "icon", maxSelect: 1, maxSize: 2097152, mimeTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/webp"] },
      ],
    }));

    // 9. frequencies (read-only global data)
    app.save(new Collection({
      name: "frequencies", type: "base",
      listRule: "", viewRule: "", createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { type: "text", name: "name", required: true },
        { type: "number", name: "value", required: true },
      ],
    }));

    // 10. subscriptions
    app.save(new Collection({
      name: "subscriptions", type: "base",
      listRule: authOnly, viewRule: authOnly, createRule: authOnly,
      updateRule: authOnly, deleteRule: authOnly,
      fields: [
        { type: "text", name: "name", required: true },
        { type: "number", name: "price", required: true },
        { type: "number", name: "frequency" },
        { type: "date", name: "next_payment" },
        { type: "bool", name: "auto_renew" },
        { type: "date", name: "start_date" },
        { type: "text", name: "notes" },
        { type: "url", name: "url" },
        { type: "bool", name: "notify" },
        { type: "number", name: "notify_days_before" },
        { type: "bool", name: "inactive" },
        { type: "date", name: "cancellation_date" },
        { type: "file", name: "logo", maxSelect: 1, maxSize: 5242880,
          mimeTypes: ["image/png", "image/jpeg", "image/svg+xml", "image/webp", "image/gif"] },
      ],
    }));

    // 11. notifications_config
    app.save(new Collection({
      name: "notifications_config", type: "base",
      listRule: authOnly, viewRule: authOnly, createRule: authOnly,
      updateRule: authOnly, deleteRule: authOnly,
      fields: [
        { type: "bool", name: "email_enabled" },
        { type: "email", name: "email_to" },
        { type: "bool", name: "discord_enabled" },
        { type: "url", name: "discord_webhook_url" },
        { type: "bool", name: "telegram_enabled" },
        { type: "text", name: "telegram_bot_token" },
        { type: "text", name: "telegram_chat_id" },
        { type: "bool", name: "gotify_enabled" },
        { type: "url", name: "gotify_url" },
        { type: "text", name: "gotify_token" },
        { type: "bool", name: "pushover_enabled" },
        { type: "text", name: "pushover_user_key" },
        { type: "text", name: "pushover_api_token" },
        { type: "bool", name: "ntfy_enabled" },
        { type: "url", name: "ntfy_url" },
        { type: "text", name: "ntfy_topic" },
        { type: "text", name: "ntfy_auth_token" },
        { type: "bool", name: "pushplus_enabled" },
        { type: "text", name: "pushplus_token" },
        { type: "bool", name: "mattermost_enabled" },
        { type: "url", name: "mattermost_webhook_url" },
        { type: "bool", name: "webhook_enabled" },
        { type: "url", name: "webhook_url" },
        { type: "bool", name: "serverchan_enabled" },
        { type: "text", name: "serverchan_send_key" },
      ],
    }));

    // 12. fixer_settings
    app.save(new Collection({
      name: "fixer_settings", type: "base",
      listRule: authOnly, viewRule: authOnly, createRule: authOnly,
      updateRule: authOnly, deleteRule: authOnly,
      fields: [
        { type: "bool", name: "enabled" },
        { type: "text", name: "api_key" },
        { type: "select", name: "provider", values: ["fixer", "apilayer"] },
        { type: "text", name: "base_currency", max: 3 },
      ],
    }));

    // 13. ai_settings
    app.save(new Collection({
      name: "ai_settings", type: "base",
      listRule: authOnly, viewRule: authOnly, createRule: authOnly,
      updateRule: authOnly, deleteRule: authOnly,
      fields: [
        { type: "bool", name: "enabled" },
        { type: "select", name: "type", values: ["chatgpt", "gemini", "openrouter", "ollama"] },
        { type: "text", name: "api_key" },
        { type: "text", name: "model" },
        { type: "url", name: "url" },
      ],
    }));

    // 14. ai_recommendations
    app.save(new Collection({
      name: "ai_recommendations", type: "base",
      listRule: authOnly, viewRule: authOnly, createRule: null, updateRule: null,
      deleteRule: authOnly,
      fields: [
        { type: "text", name: "title" },
        { type: "text", name: "description" },
        { type: "text", name: "savings" },
        { type: "text", name: "type" },
      ],
    }));

    // 15. yearly_costs
    app.save(new Collection({
      name: "yearly_costs", type: "base",
      listRule: authOnly, viewRule: authOnly,
      createRule: null, updateRule: null, deleteRule: null,
      fields: [
        { type: "number", name: "year" },
        { type: "number", name: "month" },
        { type: "number", name: "total" },
      ],
    }));

    // ================================================================
    // PHASE 2 — Add relation fields
    // ================================================================

    function addRelation(collName, fieldName, targetColl, opts) {
      const col = app.findCollectionByNameOrId(collName);
      const target = app.findCollectionByNameOrId(targetColl);
      col.fields.add(new RelationField({
        name: fieldName,
        collectionId: target.id,
        maxSelect: (opts && opts.maxSelect) || 1,
        required: (opts && opts.required) || false,
        cascadeDelete: (opts && opts.cascadeDelete) || false,
      }));
      app.save(col);
    }

    addRelation("users", "main_currency", "currencies");
    addRelation("currencies", "user", "users", { required: true, cascadeDelete: true });
    addRelation("household", "user", "users", { required: true, cascadeDelete: true });
    addRelation("categories", "user", "users", { required: true, cascadeDelete: true });
    addRelation("payment_methods", "user", "users", { required: true, cascadeDelete: true });
    addRelation("frequencies", "cycle", "cycles", { required: true });
    addRelation("subscriptions", "user", "users", { required: true, cascadeDelete: true });
    addRelation("subscriptions", "currency", "currencies");
    addRelation("subscriptions", "cycle", "cycles");
    addRelation("subscriptions", "payment_method", "payment_methods");
    addRelation("subscriptions", "payer", "household");
    addRelation("subscriptions", "category", "categories");
    addRelation("subscriptions", "replacement_subscription", "subscriptions");
    addRelation("notifications_config", "user", "users", { required: true, cascadeDelete: true });
    addRelation("fixer_settings", "user", "users", { required: true, cascadeDelete: true });
    addRelation("ai_settings", "user", "users", { required: true, cascadeDelete: true });
    addRelation("ai_recommendations", "user", "users", { required: true, cascadeDelete: true });
    addRelation("yearly_costs", "user", "users", { required: true, cascadeDelete: true });

    // ================================================================
    // PHASE 3 — Apply owner-scoped access rules
    // ================================================================

    const ownerRule = "@request.auth.id != '' && user = @request.auth.id";
    const ownerCollections = [
      "currencies", "household", "categories", "payment_methods",
      "subscriptions", "notifications_config", "fixer_settings",
      "ai_settings",
    ];

    for (const name of ownerCollections) {
      const col = app.findCollectionByNameOrId(name);
      col.listRule = ownerRule;
      col.viewRule = ownerRule;
      col.updateRule = ownerRule;
      col.deleteRule = ownerRule;
      app.save(col);
    }

    // ai_recommendations & yearly_costs: read owner-only, no user create/update
    for (const name of ["ai_recommendations", "yearly_costs"]) {
      const col = app.findCollectionByNameOrId(name);
      col.listRule = ownerRule;
      col.viewRule = ownerRule;
      app.save(col);
    }

    console.log("[Zublo] Schema created: 15 collections with relations and access rules");
  },

  // DOWN — revert
  (app) => {
    const names = [
      "yearly_costs", "ai_recommendations", "ai_settings", "fixer_settings",
      "notifications_config", "subscriptions", "frequencies", "payment_methods",
      "categories", "household", "currencies", "admin_settings",
      "exchange_log", "cycles",
    ];
    for (const name of names) {
      try {
        const col = app.findCollectionByNameOrId(name);
        app.delete(col);
      } catch (_) {}
    }
  }
);
