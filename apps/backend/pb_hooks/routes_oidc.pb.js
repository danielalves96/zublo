/// <reference path="../pb_data/types.d.ts" />

/**
 * Zublo — OIDC / SSO Routes
 *
 * Turns the provider configured in Admin → OIDC into a working single sign-on
 * flow:
 * - GET  /api/auth/oidc/config    — public; tells the login page whether the
 *                                   "Sign in with <provider>" button applies
 * - GET  /api/auth/oidc/authorize — public; resolves the provider endpoints via
 *                                   OIDC discovery and returns the authorization URL
 * - POST /api/auth/oidc/callback  — public; exchanges the authorization code for
 *                                   a PocketBase auth token
 *
 * The admin settings live in a collection that only the admin can read, so the
 * login page needs these public endpoints to know an SSO provider exists.
 * Nothing secret is exposed: only whether OIDC is usable and its display name.
 *
 * NOTE: In PocketBase JSVM (Goja), file-scope helper bindings are not
 * reliably available inside router callbacks. Require helpers inside
 * each callback so the runtime can always resolve them at request time.
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
  return $app.findRecordsByFilter("users", "1=1", "", 0, 0).length;
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

// ================================================================
// ROUTE: GET /api/auth/oidc/config — public, reveals only whether an SSO
// provider is ready to use and how it should be labelled on the login page.
// ================================================================
routerAdd("GET", "/api/auth/oidc/config", (e) => {
  const oidc = require(__hooks + "/lib/pure/oidc-core.js");
  e.response.header().set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  e.response.header().set("Pragma", "no-cache");
  e.response.header().set("Expires", "0");

  const settings = readOidcSettings();
  if (!oidc.isOidcConfigured(settings) || settings.disableLogin) {
    return e.json(200, { enabled: false, provider_name: "" });
  }

  return e.json(200, { enabled: true, provider_name: settings.providerName });
});

// ================================================================
// ROUTE: GET /api/auth/oidc/authorize — public, starts the flow by returning
// the provider authorization URL plus the signed state the callback expects.
// ================================================================
routerAdd("GET", "/api/auth/oidc/authorize", (e) => {
  const oidc = require(__hooks + "/lib/pure/oidc-core.js");

  const settings = readOidcSettings();
  if (!oidc.isOidcConfigured(settings)) {
    return e.json(400, { error: "OIDC is not configured" });
  }
  if (settings.disableLogin) {
    return e.json(403, { error: "Logins are currently disabled" });
  }

  let endpoints = null;
  try {
    endpoints = discoverOidcEndpoints(settings.issuerUrl);
  } catch (err) {
    return e.json(502, { error: "OIDC discovery failed: " + err });
  }
  if (!endpoints) {
    return e.json(502, { error: "OIDC discovery failed for the configured issuer" });
  }

  const nonce = $security.randomString(32);
  const state = oidc.createStateToken(nonce, Date.now(), (payload) =>
    $security.hs256(payload, settings.clientSecret));

  return e.json(200, {
    authorization_url: oidc.buildAuthorizationUrl({
      authorizationEndpoint: endpoints.authorizationEndpoint,
      clientId: settings.clientId,
      redirectUrl: settings.redirectUrl,
      scopes: settings.scopes,
      state: state,
      nonce: nonce,
    }),
    state: state,
  });
});

// ================================================================
// ROUTE: POST /api/auth/oidc/callback — public, trades the authorization code
// for a PocketBase auth token. Users are matched by the provider's subject
// claim; an unknown subject may adopt a matching local account only when the
// provider vouches for the email, otherwise a new account is created.
// ================================================================
routerAdd("POST", "/api/auth/oidc/callback", (e) => {
  const oidc = require(__hooks + "/lib/pure/oidc-core.js");

  const body = e.requestInfo().body;
  const code = String(body.code || "").trim();
  const state = String(body.state || "").trim();

  if (!code) return e.json(400, { error: "code is required" });
  if (!state) return e.json(400, { error: "state is required" });

  const settings = readOidcSettings();
  if (!oidc.isOidcConfigured(settings)) {
    return e.json(400, { error: "OIDC is not configured" });
  }
  if (settings.disableLogin) {
    return e.json(403, { error: "Logins are currently disabled" });
  }

  const stateIsValid = oidc.verifyStateToken(
    state,
    (payload) => $security.hs256(payload, settings.clientSecret),
    Date.now(),
    OIDC_STATE_TTL_MS,
    (expected, actual) => $security.equal(expected, actual),
  );
  if (!stateIsValid) {
    return e.json(400, { error: "Invalid or expired OIDC state" });
  }

  let endpoints = null;
  try {
    endpoints = discoverOidcEndpoints(settings.issuerUrl);
  } catch (err) {
    return e.json(502, { error: "OIDC discovery failed: " + err });
  }
  if (!endpoints) {
    return e.json(502, { error: "OIDC discovery failed for the configured issuer" });
  }

  let tokenRes = null;
  try {
    tokenRes = $http.send({
      url: endpoints.tokenEndpoint,
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
      },
      body: oidc.encodeFormBody({
        grant_type: "authorization_code",
        code: code,
        redirect_uri: settings.redirectUrl,
        client_id: settings.clientId,
        client_secret: settings.clientSecret,
      }),
    });
  } catch (err) {
    return e.json(502, { error: "OIDC token exchange failed: " + err });
  }

  if (tokenRes.statusCode !== 200 || !tokenRes.json || !tokenRes.json.access_token) {
    return e.json(502, { error: "OIDC token exchange failed (status " + tokenRes.statusCode + ")" });
  }

  // The ID token comes back over the same TLS connection that authenticated
  // this client, so its claims can be trusted without re-checking the
  // signature — but they still have to be the claims we asked for.
  if (!tokenRes.json.id_token) {
    return e.json(502, { error: "OIDC provider did not return an id_token" });
  }

  let idTokenClaims = null;
  try {
    idTokenClaims = $security.parseUnverifiedJWT(String(tokenRes.json.id_token));
  } catch (err) {
    return e.json(400, { error: "OIDC id_token could not be read: " + err });
  }

  const claimError = oidc.validateIdTokenClaims({
    claims: idTokenClaims,
    expectedIssuer: endpoints.issuer,
    clientId: settings.clientId,
    nonce: oidc.readStateNonce(state),
    now: Date.now(),
  });
  if (claimError) return e.json(400, { error: "OIDC " + claimError });

  let userInfoRes = null;
  try {
    userInfoRes = $http.send({
      url: endpoints.userInfoEndpoint,
      method: "GET",
      headers: {
        "Authorization": "Bearer " + tokenRes.json.access_token,
        "Accept": "application/json",
      },
    });
  } catch (err) {
    return e.json(502, { error: "OIDC userinfo request failed: " + err });
  }

  if (userInfoRes.statusCode !== 200 || !userInfoRes.json) {
    return e.json(502, { error: "OIDC userinfo request failed (status " + userInfoRes.statusCode + ")" });
  }

  const profile = oidc.extractOidcProfile(userInfoRes.json);
  if (!profile.subject) {
    return e.json(400, { error: "OIDC provider did not return a subject" });
  }
  if (!profile.email) {
    return e.json(400, { error: "OIDC provider did not return an email address" });
  }
  if (profile.emailVerified === false) {
    return e.json(403, { error: "The OIDC account has an unverified email address" });
  }
  // The userinfo response must describe the same person the ID token did.
  if (String(idTokenClaims.sub || "") !== profile.subject) {
    return e.json(400, { error: "OIDC subject mismatch between id_token and userinfo" });
  }

  // Returning SSO users are matched on the provider's immutable subject, never
  // on an email address the provider could have reassigned since last login.
  let user = null;
  const bySubject = $app.findRecordsByFilter(
    "users", "oidc_subject = {:subject}", "", 1, 0, { subject: profile.subject }
  );
  if (bySubject.length > 0) user = bySubject[0];

  if (!user) {
    const byEmail = $app.findRecordsByFilter(
      "users", "email = {:email}", "", 1, 0, { email: profile.email }
    );

    if (byEmail.length > 0) {
      const candidate = byEmail[0];

      // Already bound to a different provider identity: two subjects claiming
      // one address is a conflict for the admin to resolve, not something to
      // silently rebind.
      if (candidate.getString("oidc_subject") !== "") {
        return e.json(409, { error: "That email is already linked to another OIDC account" });
      }

      // Adopting a pre-existing local account is the account-takeover path, so
      // it needs the provider to positively vouch for the address.
      if (!oidc.canClaimExistingAccount(profile)) {
        return e.json(403, {
          error: "The OIDC provider did not confirm this email address is verified",
        });
      }

      candidate.set("oidc_subject", profile.subject);
      $app.save(candidate);
      user = candidate;
    }
  }

  if (!user) {
    // Creating an account here is a self-registration, so it obeys the same
    // policy the admin set for the signup form.
    if (!oidc.canProvisionNewAccount(settings, countUsers())) {
      return e.json(403, { error: "Registrations are closed on this instance" });
    }

    const col = $app.findCollectionByNameOrId("users");
    user = new Record(col);
    user.set("email", profile.email);
    user.set("name", profile.name);
    user.set("oidc_subject", profile.subject);
    user.set("verified", profile.emailVerified === true);
    // SSO accounts never sign in with a password — set an unguessable one so
    // the record stays valid for the auth collection.
    user.setPassword($security.randomString(40));
    $app.save(user);
  }

  return e.json(200, {
    token: user.newAuthToken(),
    record: user.publicExport(),
  });
});
