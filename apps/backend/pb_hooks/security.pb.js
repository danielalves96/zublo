/// <reference path="../pb_data/types.d.ts" />

/**
 * Security Hook — API Key Masking
 *
 * Ensures that 'api_key' fields in 'ai_settings' and 'fixer_settings'
 * are never leaked in API responses, even though they are visible in the schema
 * to allow updates.
 *
 * NOTE: In PocketBase JSVM (Goja), file-scope bindings are not reliably
 * available inside hook callbacks: they run on a pooled runtime that never
 * evaluated this file's top level. The collection names are passed as hook
 * tags instead, so PocketBase only ever invokes these callbacks for the
 * protected collections and no in-callback guard is needed.
 */

const PROTECTED_COLLECTIONS = ["ai_settings", "fixer_settings"];

onRecordViewRequest((e) => {
  e.record.set("api_key", "");
  e.next();
}, ...PROTECTED_COLLECTIONS);

onRecordsListRequest((e) => {
  for (const record of e.records) {
    record.set("api_key", "");
  }
  e.next();
}, ...PROTECTED_COLLECTIONS);
