/**
 * OIDC settings and provider discovery.
 *
 * These live in a required module rather than at the top of
 * routes_oidc.pb.js because PocketBase runs each router callback on a pooled
 * Goja runtime that never evaluated that file's top level, so anything
 * declared there is missing at request time.
 */

const OIDC_STATE_TTL_MS = 10 * 60 * 1000;

/**
 * Reads the singleton admin_settings record. Besides the OIDC credentials this
 * carries the access policy the admin set for the signup form, because signing
 * in through a provider is still subject to it.
 */
function readOidcSettings() {
  let record = null;
  try {
    const all = $app.findRecordsByFilter("admin_settings", "", "", 1, 0);
    if (all.length > 0) record = all[0];
  } catch (_) {}

  if (!record) return null;

  return {
    enabled: record.getBool("oidc_enabled"),
    providerName: record.getString("oidc_provider_name"),
    clientId: record.getString("oidc_client_id"),
    clientSecret: record.getString("oidc_client_secret"),
    issuerUrl: record.getString("oidc_issuer_url"),
    redirectUrl: record.getString("oidc_redirect_url"),
    scopes: record.getString("oidc_scopes"),
    openRegistrations: record.getBool("open_registrations"),
    maxUsers: record.getFloat("max_users"),
    disableLogin: record.getBool("disable_login"),
  };
}

/** Counts the existing accounts so `max_users` can be honoured. */
function countUsers() {
  return $app.countRecords("users");
}

/** Fetches the provider discovery document and validates the endpoints it lists. */
function discoverOidcEndpoints(issuerUrl) {
  const oidc = require(__hooks + "/lib/pure/oidc-core.js");

  const res = $http.send({
    url: oidc.buildDiscoveryUrl(issuerUrl),
    method: "GET",
    headers: { "Accept": "application/json" },
  });

  if (res.statusCode !== 200 || !res.json) return null;

  const endpoints = oidc.extractDiscoveryEndpoints(res.json);
  return oidc.hasRequiredEndpoints(endpoints) ? endpoints : null;
}

module.exports = {
  OIDC_STATE_TTL_MS,
  readOidcSettings,
  countUsers,
  discoverOidcEndpoints,
};
