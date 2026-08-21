/**
 * Pure OIDC helpers — no PocketBase globals, no network access.
 *
 * Everything that can be reasoned about without a running provider lives here
 * so it can be unit tested: discovery URL building, scope normalization,
 * authorization URL assembly, form encoding, claim extraction, ID token
 * validation and the signed state token used as CSRF protection between
 * /authorize and /callback.
 */

const DEFAULT_SCOPES = "openid email profile";
const STATE_TTL_MS = 10 * 60 * 1000;
const DISCOVERY_PATH = "/.well-known/openid-configuration";
const ID_TOKEN_LEEWAY_MS = 60 * 1000;

function trimString(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

/** Removes surrounding whitespace and any trailing slashes from the issuer. */
function normalizeIssuerUrl(issuerUrl) {
  return trimString(issuerUrl).replace(/\/+$/, "");
}

/**
 * Accepts either the issuer root (`https://idp.example.com`) or a full
 * discovery URL, since admins commonly paste either one.
 */
function buildDiscoveryUrl(issuerUrl) {
  const issuer = normalizeIssuerUrl(issuerUrl);
  if (!issuer) return "";
  if (issuer.indexOf(DISCOVERY_PATH) !== -1) return issuer;
  return issuer + DISCOVERY_PATH;
}

/** Guarantees the `openid` scope and falls back to the usual defaults. */
function normalizeScopes(rawScopes) {
  const scopes = trimString(rawScopes).split(/\s+/).filter(Boolean);
  if (scopes.length === 0) return DEFAULT_SCOPES;
  if (scopes.indexOf("openid") === -1) scopes.unshift("openid");
  return scopes.join(" ");
}

/** OIDC is usable only when every credential the flow needs is present. */
function isOidcConfigured(settings) {
  if (!settings || !settings.enabled) return false;
  return (
    trimString(settings.clientId) !== ""
    && trimString(settings.clientSecret) !== ""
    && trimString(settings.issuerUrl) !== ""
    && trimString(settings.redirectUrl) !== ""
  );
}

/** Serializes params as `application/x-www-form-urlencoded`, skipping empties. */
function encodeFormBody(params) {
  const pairs = [];
  for (const key of Object.keys(params || {})) {
    const value = trimString(params[key]);
    if (value === "") continue;
    pairs.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
  }
  return pairs.join("&");
}

/**
 * Reads the endpoints the login flow needs out of the discovery document,
 * plus the issuer the provider declares for itself — that value, not the URL
 * the admin typed, is what an ID token must be signed by.
 */
function extractDiscoveryEndpoints(document) {
  const doc = document || {};
  return {
    issuer: normalizeIssuerUrl(doc.issuer),
    authorizationEndpoint: trimString(doc.authorization_endpoint),
    tokenEndpoint: trimString(doc.token_endpoint),
    userInfoEndpoint: trimString(doc.userinfo_endpoint),
  };
}

function hasRequiredEndpoints(endpoints) {
  return (
    !!endpoints
    && endpoints.issuer !== ""
    && endpoints.authorizationEndpoint !== ""
    && endpoints.tokenEndpoint !== ""
    && endpoints.userInfoEndpoint !== ""
  );
}

function buildAuthorizationUrl(params) {
  const query = [
    "response_type=code",
    "client_id=" + encodeURIComponent(trimString(params.clientId)),
    "redirect_uri=" + encodeURIComponent(trimString(params.redirectUrl)),
    "scope=" + encodeURIComponent(normalizeScopes(params.scopes)),
    "state=" + encodeURIComponent(trimString(params.state)),
    "nonce=" + encodeURIComponent(trimString(params.nonce)),
  ].join("&");

  const endpoint = trimString(params.authorizationEndpoint);
  const separator = endpoint.indexOf("?") === -1 ? "?" : "&";
  return endpoint + separator + query;
}

/**
 * Reads the `email_verified` claim as a tri-state: true, false, or null when
 * the provider does not send it at all. Providers disagree on the type, so
 * both booleans and their string spellings are accepted.
 */
function readEmailVerified(source) {
  const raw = source.email_verified;
  if (raw === undefined || raw === null || raw === "") return null;
  if (typeof raw === "boolean") return raw;

  const normalized = trimString(raw).toLowerCase();
  if (normalized === "true" || normalized === "1") return true;
  if (normalized === "false" || normalized === "0") return false;
  return null;
}

/** Maps provider claims onto the fields Zublo stores for a user. */
function extractOidcProfile(claims) {
  const source = claims || {};
  const email = trimString(source.email).toLowerCase();
  const name = trimString(source.name)
    || trimString(source.preferred_username)
    || (email ? email.split("@")[0] : "");

  return {
    subject: trimString(source.sub),
    email: email,
    emailVerified: readEmailVerified(source),
    name: name,
  };
}

/**
 * An account that already exists locally may only be adopted by the provider
 * when it positively asserts the address is verified. Without that assertion
 * anyone able to register the address at the identity provider could sign in
 * as its owner, so a missing claim is treated as "not verified".
 */
function canClaimExistingAccount(profile) {
  return !!profile && profile.emailVerified === true;
}

/**
 * Signing in through a provider still creates a local account, so the admin's
 * signup policy applies: registrations must be open and the user limit, when
 * one is set, must not be reached yet.
 */
function canProvisionNewAccount(policy, userCount) {
  if (!policy || !policy.openRegistrations) return false;

  const max = Number(policy.maxUsers);
  if (isFinite(max) && max > 0 && Number(userCount) >= max) return false;

  return true;
}

/**
 * Validates the claims of an ID token that was fetched straight from the token
 * endpoint. OIDC Core 3.1.3.7 lets the TLS connection to that endpoint stand in
 * for signature verification, so what is left to check is that the token was
 * minted by the discovered issuer, for this client, is still fresh and carries
 * back the nonce minted in /authorize.
 *
 * Returns null when the token is acceptable, or a short reason to reject it.
 */
function validateIdTokenClaims(params) {
  const options = params || {};
  const claims = options.claims;
  if (!claims) return "id_token is missing";

  const expectedIssuer = normalizeIssuerUrl(options.expectedIssuer);
  if (expectedIssuer === "" || normalizeIssuerUrl(claims.iss) !== expectedIssuer) {
    return "id_token issuer mismatch";
  }

  const clientId = trimString(options.clientId);
  const audiences = (Array.isArray(claims.aud) ? claims.aud : [claims.aud]).map(trimString);
  if (clientId === "" || audiences.indexOf(clientId) === -1) {
    return "id_token audience mismatch";
  }

  // With several audiences the provider must name which one it was issued for.
  if (audiences.length > 1 && trimString(claims.azp) !== clientId) {
    return "id_token authorized party mismatch";
  }

  const expiresAt = Number(claims.exp);
  if (!isFinite(expiresAt) || expiresAt <= 0) return "id_token has no expiry";

  const leeway = options.leewayMs === undefined ? ID_TOKEN_LEEWAY_MS : options.leewayMs;
  if (expiresAt * 1000 + leeway < Number(options.now)) return "id_token expired";

  if (trimString(claims.nonce) !== trimString(options.nonce)) {
    return "id_token nonce mismatch";
  }

  return null;
}

/**
 * Stateless CSRF token: `nonce.issuedAt.signature`. The signature is produced
 * by the caller (HMAC keyed with the OIDC client secret), so no extra
 * collection is needed to remember pending logins.
 */
function createStateToken(nonce, issuedAt, sign) {
  const payload = trimString(nonce) + "." + String(issuedAt);
  return payload + "." + sign(payload);
}

function verifyStateToken(token, sign, now, ttlMs, equals) {
  const value = trimString(token);
  const nonceEnd = value.indexOf(".");
  const issuedAtEnd = nonceEnd === -1 ? -1 : value.indexOf(".", nonceEnd + 1);
  if (nonceEnd <= 0 || issuedAtEnd === -1) return false;

  const payload = value.slice(0, issuedAtEnd);
  const signature = value.slice(issuedAtEnd + 1);
  const issuedAt = Number(value.slice(nonceEnd + 1, issuedAtEnd));
  if (!isFinite(issuedAt) || issuedAt <= 0) return false;

  const ttl = ttlMs || STATE_TTL_MS;
  if (now - issuedAt > ttl || issuedAt > now) return false;
  if (signature === "") return false;

  const compare = equals || ((a, b) => a === b);
  return compare(sign(payload), signature);
}

/**
 * Recovers the nonce half of a state token so the callback can match it
 * against the one the provider echoes back inside the ID token.
 */
function readStateNonce(token) {
  const value = trimString(token);
  const nonceEnd = value.indexOf(".");
  return nonceEnd <= 0 ? "" : value.slice(0, nonceEnd);
}

module.exports = {
  DEFAULT_SCOPES: DEFAULT_SCOPES,
  STATE_TTL_MS: STATE_TTL_MS,
  ID_TOKEN_LEEWAY_MS: ID_TOKEN_LEEWAY_MS,
  normalizeIssuerUrl: normalizeIssuerUrl,
  buildDiscoveryUrl: buildDiscoveryUrl,
  normalizeScopes: normalizeScopes,
  isOidcConfigured: isOidcConfigured,
  encodeFormBody: encodeFormBody,
  extractDiscoveryEndpoints: extractDiscoveryEndpoints,
  hasRequiredEndpoints: hasRequiredEndpoints,
  buildAuthorizationUrl: buildAuthorizationUrl,
  extractOidcProfile: extractOidcProfile,
  canClaimExistingAccount: canClaimExistingAccount,
  canProvisionNewAccount: canProvisionNewAccount,
  validateIdTokenClaims: validateIdTokenClaims,
  createStateToken: createStateToken,
  verifyStateToken: verifyStateToken,
  readStateNonce: readStateNonce,
};
