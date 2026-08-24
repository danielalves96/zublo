/// <reference path="../pb_data/types.d.ts" />

/**
 * Migration 0023 — Restrict ai_settings creation to the authenticated owner.
 *
 * ai_settings has the same shape as fixer_settings: a single record per user
 * that holds a writable provider URL (and, previously, the provider's secret).
 * It has always carried the permissive `@request.auth.id != ''` create rule,
 * which let any authenticated user create a record owned by another user. The
 * routes that consume ai_settings select the first enabled record for a user,
 * so a planted record could win and redirect a victim's prompts to an
 * attacker-controlled endpoint.
 *
 * This aligns ai_settings with fixer_settings (migration 0022) and the
 * owner-scoped list/view/update/delete rules already applied to it.
 */
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId("ai_settings");
    col.createRule =
      "@request.auth.id != '' && @request.body.user = @request.auth.id";
    app.save(col);
  },
  (app) => {
    const col = app.findCollectionByNameOrId("ai_settings");
    col.createRule = "@request.auth.id != ''";
    app.save(col);
  },
);
