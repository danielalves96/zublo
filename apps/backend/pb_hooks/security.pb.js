/// <reference path="../pb_data/types.d.ts" />

/**
 * Security Hook — API Key Masking
 *
 * Ensures that 'api_key' fields in 'ai_settings' and 'fixer_settings'
 * are never leaked in API responses, even though they are visible in the schema
 * to allow updates.
 */

const PROTECTED_COLLECTIONS = ["ai_settings", "fixer_settings"];

onRecordViewRequest((e) => {
  if (PROTECTED_COLLECTIONS.indexOf(e.collection.name) !== -1) {
    e.record.set("api_key", "");
  }
}, ...PROTECTED_COLLECTIONS);

onRecordsListRequest((e) => {
  if (PROTECTED_COLLECTIONS.indexOf(e.collection.name) !== -1) {
    for (const record of e.records) {
      record.set("api_key", "");
    }
  }
}, ...PROTECTED_COLLECTIONS);
