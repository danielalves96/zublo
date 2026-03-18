/**
 * NOTE: PocketBase globals ($app, $security) are NOT available in required modules.
 * Use the inline version of resolveApiKey directly in each hook file instead.
 * This file is kept as documentation only.
 *
 * Copy this function into any hook file that needs API key validation:
 *
 * function resolveApiKey(rawKey, requiredPermission) {
 *   if (!rawKey) return null;
 *   const keyHash = $security.sha256(rawKey);
 *   let keys;
 *   try {
 *     keys = $app.findRecordsByFilter("api_keys", "key_hash = {:hash}", "", 1, 0, { hash: keyHash });
 *   } catch (_) { return null; }
 *   if (!keys || keys.length === 0) return null;
 *   const keyRecord = keys[0];
 *   let permissions = [];
 *   try { permissions = JSON.parse(keyRecord.get("permissions") || "[]"); } catch (_) {}
 *   if (!permissions.includes(requiredPermission)) return null;
 *   keyRecord.set("last_used_at", new Date().toISOString());
 *   try { $app.save(keyRecord); } catch (_) {}
 *   return keyRecord.get("user");
 * }
 */
