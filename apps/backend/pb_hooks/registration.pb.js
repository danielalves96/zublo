/// <reference path="../pb_data/types.d.ts" />

/**
 * Registration policy enforcement.
 *
 * The admin_settings singleton is admin-only (null list/view rules), so the
 * public login page cannot read `open_registrations` and the users collection
 * create rule is a bare "" — meaning nothing anywhere actually enforced the
 * toggle. Closing registrations changed the switch and nothing else.
 *
 * This adds the two halves that were missing: a public endpoint the login
 * page can ask, and a guard on the create request itself so the answer
 * cannot simply be ignored by posting straight to the collection.
 *
 * The OIDC callback provisions accounts through $app.save(), which no
 * request hook can see, so it answers to lib/pure/registration-policy.js
 * directly. Both paths share that module so they can never disagree.
 *
 * NOTE: In PocketBase JSVM (Goja), file-scope helper bindings are not
 * reliably available inside hook callbacks: they run on a pooled runtime
 * that never evaluated this file's top level. Require helpers inside each
 * callback so the runtime can always resolve them at request time.
 */

// ================================================================
// ROUTE: GET /api/auth/registration-status — public.
// Reveals only whether a signup would be accepted. The thresholds
// themselves stay admin-only; a caller learns nothing it could not
// already discover by attempting to register.
// ================================================================
routerAdd("GET", "/api/auth/registration-status", (e) => {
  const policy = require(__hooks + "/lib/pure/registration-policy.js");

  e.response.header().set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  e.response.header().set("Pragma", "no-cache");
  e.response.header().set("Expires", "0");

  let settings = { openRegistrations: false, maxUsers: 0, disableLogin: false };
  try {
    const rows = $app.findRecordsByFilter("admin_settings", "", "", 1, 0);
    if (rows.length > 0) {
      settings = {
        openRegistrations: rows[0].getBool("open_registrations"),
        maxUsers: rows[0].getFloat("max_users"),
        disableLogin: rows[0].getBool("disable_login"),
      };
    }
  } catch (_) {}

  let userCount = 0;
  try { userCount = $app.countRecords("users"); } catch (_) {}

  return e.json(200, { open: policy.isRegistrationOpen(settings, userCount) });
});

// ================================================================
// GUARD: users create requests.
//
// Both self-registration and the admin "add user" modal post to
// pb.collection("users").create(), so the guard has to tell them apart:
// an authenticated request from the first registered user is an admin
// adding someone deliberately and is always allowed. Everything else is
// a public signup and answers to the policy.
// ================================================================
onRecordCreateRequest((e) => {
  const policy = require(__hooks + "/lib/pure/registration-policy.js");

  let userCount = 0;
  try { userCount = $app.countRecords("users"); } catch (_) {}

  if (policy.isBootstrap(userCount)) return e.next();

  if (e.auth) {
    const admins = $app.findRecordsByFilter("users", "", "+created", 1, 0);
    if (admins.length > 0 && admins[0].id === e.auth.id) return e.next();
  }

  let settings = { openRegistrations: false, maxUsers: 0, disableLogin: false };
  try {
    const rows = $app.findRecordsByFilter("admin_settings", "", "", 1, 0);
    if (rows.length > 0) {
      settings = {
        openRegistrations: rows[0].getBool("open_registrations"),
        maxUsers: rows[0].getFloat("max_users"),
        disableLogin: rows[0].getBool("disable_login"),
      };
    }
  } catch (_) {}

  const rejection = policy.registrationRejection(settings, userCount);
  if (rejection) throw new ForbiddenError(rejection);

  return e.next();
}, "users");
