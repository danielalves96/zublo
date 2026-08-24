/// <reference path="../pb_data/types.d.ts" />

/**
 * Security Hook — API Key Masking
 *
 * Ensures that 'api_key' fields in 'ai_settings' and 'fixer_settings'
 * are never leaked in API responses, even though they must remain writable in
 * the schema so authenticated users can replace their own key.
 *
 * NOTE: In PocketBase JSVM (Goja), file-scope bindings are not reliably
 * available inside hook callbacks: they run on a pooled runtime that never
 * evaluated this file's top level. The collection names are passed as hook
 * tags instead, so PocketBase only ever invokes these callbacks for the
 * protected collections and no in-callback guard is needed.
 */

const PROTECTED_COLLECTIONS = ["ai_settings", "fixer_settings"];

// Enrichment runs for every record response (list, view, create, update,
// realtime, and expanded records). Hide after e.next() so PocketBase's default
// enrichment cannot re-enable the field for a privileged request.
onRecordEnrich(
  (e) => {
    e.next();
    e.record.hide("api_key");
  },
  ...PROTECTED_COLLECTIONS,
);

// api_key_configured is derived from the value PocketBase is about to persist;
// never trust a client-supplied boolean that can drift from the actual secret.
onRecordCreateRequest(
  (e) => {
    e.record.set(
      "api_key_configured",
      String(e.record.get("api_key") || "").trim() !== "",
    );
    e.next();
  },
  ...PROTECTED_COLLECTIONS,
);

onRecordUpdateRequest(
  (e) => {
    e.record.set(
      "api_key_configured",
      String(e.record.get("api_key") || "").trim() !== "",
    );
    e.next();
  },
  ...PROTECTED_COLLECTIONS,
);
