/// <reference path="../pb_data/types.d.ts" />

var totpLib = require(__hooks + "/lib/totp.js");

/**
 * Zublo — Custom API Routes
 *
 * Endpoints that extend PocketBase's built-in CRUD:
 * - Logo search (Google/Brave scraping)
 * - AI recommendations (ChatGPT/Gemini/OpenRouter/Ollama)
 * - Subscription actions (clone, renew, export)
 * - Calendar (iCal feed, monthly data)
 * - Database backup/restore
 * - Admin utilities
 */

// ================================================================
// ROUTE: GET /api/auth/bootstrap-status — public, reveals only whether
// at least one user exists so the login page can redirect first-run setups.
// ================================================================
routerAdd("GET", "/api/auth/bootstrap-status", (e) => {
  e.response.header().set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  e.response.header().set("Pragma", "no-cache");
  e.response.header().set("Expires", "0");
  const all = $app.findRecordsByFilter("users", "1=1", "+created", 1, 0);
  return e.json(200, { hasUsers: all.length > 0 });
});

// ================================================================
// ROUTE: GET /api/auth/is-admin — authenticated, returns only whether
// the current user is the first registered user.
// ================================================================
routerAdd("GET", "/api/auth/is-admin", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  e.response.header().set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
  e.response.header().set("Pragma", "no-cache");
  e.response.header().set("Expires", "0");
  e.response.header().set("Vary", "Authorization");

  const all = $app.findRecordsByFilter("users", "1=1", "+created", 1, 0);
  if (all.length === 0) {
    return e.json(200, { isAdmin: false });
  }

  return e.json(200, { isAdmin: all[0].id === e.auth.id });
});

// ================================================================
// TOTP UTILITIES
// ================================================================

var verifyTOTP = totpLib.verifyTOTP;
var generateBackupCodes = totpLib.generateBackupCodes;

const TOTP_LOGIN_CHALLENGE_TTL_MS = 5 * 60 * 1000;

function hashTotpLoginChallenge(challenge) {
  return $security.sha256(String(challenge || ""));
}

function clearTotpLoginChallenge(user) {
  user.set("totp_login_challenge_hash", "");
  user.set("totp_login_challenge_expires", "");
}

function createTotpLoginChallenge(user) {
  const challenge = $security.randomString(64);
  const expiresAt = new Date(Date.now() + TOTP_LOGIN_CHALLENGE_TTL_MS).toISOString();

  user.set("totp_login_challenge_hash", hashTotpLoginChallenge(challenge));
  user.set("totp_login_challenge_expires", expiresAt);
  $app.save(user);

  return { challenge, expiresAt };
}

function findUserByTotpLoginChallenge(challenge) {
  const normalizedChallenge = String(challenge || "").trim();
  if (!normalizedChallenge) return null;

  const rows = $app.findRecordsByFilter(
    "users",
    "totp_login_challenge_hash = {:hash}",
    "",
    1,
    0,
    { hash: hashTotpLoginChallenge(normalizedChallenge) },
  );

  if (!rows || rows.length === 0) return null;

  const user = rows[0];
  const expiresAt = String(user.get("totp_login_challenge_expires") || "");
  if (!expiresAt || Date.parse(expiresAt) <= Date.now()) {
    clearTotpLoginChallenge(user);
    $app.save(user);
    return null;
  }

  return user;
}

// ================================================================
// ROUTE: TOTP Setup — generate secret + backup codes (not saved yet)
// ================================================================
routerAdd('POST', '/api/auth/totp/setup', function (e) {
  if (!e.auth) return e.json(401, { error: 'Authentication required' });

  var user = $app.findRecordById('users', e.auth.id);
  var email = String(user.get('email') || e.auth.id);
  var a32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  var secret = $security.randomStringWithAlphabet(32, a32);
  var label = encodeURIComponent('Zublo:' + email);
  var uri = 'otpauth://totp/' + label +
    '?secret=' + secret +
    '&issuer=Zublo&algorithm=SHA1&digits=6&period=30';

  var bc = generateBackupCodes();
  return e.json(200, { secret: secret, otpauthUri: uri, backupCodes: bc });
});

// ================================================================
// ROUTE: TOTP Verify — confirm code, then persist and enable 2FA
// ================================================================
routerAdd('POST', '/api/auth/totp/verify', function (e) {
  if (!e.auth) return e.json(401, { error: 'Authentication required' });

  var body = e.requestInfo().body;
  var code = String(body.code || '').trim();
  var secret = String(body.secret || '').trim();

  if (!code || !secret) return e.json(400, { error: 'Missing code or secret' });
  if (!verifyTOTP(secret, code)) return e.json(400, { error: 'Invalid verification code' });

  var raw = body.backupCodes;
  var bcs = [];
  if (raw && typeof raw === 'object') {
    for (var i = 0; i < raw.length; i++) bcs.push(String(raw[i]));
  }

  var user = $app.findRecordById('users', e.auth.id);
  user.set('totp_secret', secret);
  user.set('totp_enabled', true);
  user.set('totp_configured', true);
  user.set('totp_backup_codes', JSON.stringify(bcs));
  $app.save(user);
  return e.json(200, { message: '2FA enabled' });
});

// ================================================================
// ROUTE: TOTP Disable — verify current code (or backup), then disable
// ================================================================
routerAdd('POST', '/api/auth/totp/disable', function (e) {
  if (!e.auth) return e.json(401, { error: 'Authentication required' });

  var body = e.requestInfo().body;
  var code = String(body.code || '').trim();
  var user = $app.findRecordById('users', e.auth.id);
  var secret = String(user.get('totp_secret') || '');
  var ok = verifyTOTP(secret, code);

  if (!ok) {
    var saved = [];
    try { saved = JSON.parse(String(user.get('totp_backup_codes') || '[]')); } catch (_) { }
    var idx = totpLib.findBackupCodeIndex(saved, code);
    if (idx !== -1) { saved.splice(idx, 1); user.set('totp_backup_codes', JSON.stringify(saved)); ok = true; }
  }
  if (!ok) return e.json(400, { error: 'Invalid code' });

  user.set('totp_enabled', false);
  user.set('totp_configured', true);
  // Secret and backup codes are intentionally kept so the user can re-enable
  // without going through setup again. Use /delete to wipe everything.
  $app.save(user);
  return e.json(200, { message: '2FA disabled' });
});

// ================================================================
// ROUTE: TOTP Re-enable — verify code, flip totp_enabled back on
// ================================================================
routerAdd('POST', '/api/auth/totp/reenable', function (e) {
  if (!e.auth) return e.json(401, { error: 'Authentication required' });

  var body = e.requestInfo().body;
  var code = String(body.code || '').trim();
  var user = $app.findRecordById('users', e.auth.id);
  var secret = String(user.get('totp_secret') || '');
  if (!secret) return e.json(400, { error: '2FA is not configured' });
  if (!verifyTOTP(secret, code)) return e.json(400, { error: 'Invalid code' });
  user.set('totp_enabled', true);
  user.set('totp_configured', true);
  $app.save(user);
  return e.json(200, { message: '2FA re-enabled' });
});

// ================================================================
// ROUTE: TOTP Delete — verify code/backup then wipe all TOTP data
// ================================================================
routerAdd('POST', '/api/auth/totp/delete', function (e) {
  if (!e.auth) return e.json(401, { error: 'Authentication required' });

  var body = e.requestInfo().body;
  var code = String(body.code || '').trim();
  var user = $app.findRecordById('users', e.auth.id);
  var secret = String(user.get('totp_secret') || '');
  var ok = verifyTOTP(secret, code);

  if (!ok) {
    var saved = [];
    try { saved = JSON.parse(String(user.get('totp_backup_codes') || '[]')); } catch (_) { }
    ok = totpLib.findBackupCodeIndex(saved, code) !== -1;
  }
  if (!ok) return e.json(400, { error: 'Invalid code' });

  user.set('totp_enabled', false);
  user.set('totp_configured', false);
  user.set('totp_secret', '');
  user.set('totp_backup_codes', '[]');
  $app.save(user);
  return e.json(200, { message: '2FA deleted' });
});

// ================================================================
// ROUTE: TOTP Regenerate Backup Codes
// ================================================================
routerAdd('POST', '/api/auth/totp/regenerate_backup', function (e) {
  if (!e.auth) return e.json(401, { error: 'Authentication required' });

  var body = e.requestInfo().body;
  var code = String(body.code || '').trim();
  var user = $app.findRecordById('users', e.auth.id);
  var secret = String(user.get('totp_secret') || '');

  if (!verifyTOTP(secret, code)) return e.json(400, { error: 'Invalid code' });

  var nbc = generateBackupCodes();
  user.set('totp_backup_codes', JSON.stringify(nbc));
  $app.save(user);
  return e.json(200, { backupCodes: nbc });
});

// ================================================================
// ROUTE: TOTP Login Challenge — issued after password auth succeeds.
// Stores only a short-lived hashed challenge server-side.
// ================================================================
routerAdd('POST', '/api/auth/totp/login-challenge', function (e) {
  if (!e.auth) return e.json(401, { error: 'Authentication required' });

  var user = $app.findRecordById('users', e.auth.id);
  if (!user.get('totp_enabled')) {
    return e.json(400, { error: '2FA is not enabled for this account' });
  }

  clearTotpLoginChallenge(user);
  var issued = createTotpLoginChallenge(user);

  return e.json(200, {
    challenge: issued.challenge,
    expires_at: issued.expiresAt,
    user_id: user.id,
  });
});

// ================================================================
// ROUTE: TOTP Login Verify — consumes a challenge and returns a final
// PocketBase auth token only after the second factor succeeds.
// ================================================================
routerAdd('POST', '/api/auth/totp/login-verify', function (e) {
  var body = e.requestInfo().body;
  var challenge = String(body.challenge || '').trim();
  var code = String(body.code || '').replace(/\s/g, '');

  if (!challenge) return e.json(400, { error: 'challenge is required' });
  if (!code) return e.json(400, { error: 'code is required' });

  var user = findUserByTotpLoginChallenge(challenge);
  if (!user) {
    return e.json(401, { error: 'Invalid or expired login challenge' });
  }
  if (!user.get('totp_enabled')) {
    clearTotpLoginChallenge(user);
    $app.save(user);
    return e.json(400, { error: '2FA is not enabled for this account' });
  }

  var secret = String(user.get('totp_secret') || '');
  var stripped = code.replace(/-/g, '');
  var isValid = false;

  if (stripped.length >= 8) {
    var rawCodes = String(user.get('totp_backup_codes') || '[]');
    var codes = [];
    try { codes = JSON.parse(rawCodes); } catch (_) { }

    var idx = totpLib.findBackupCodeIndex(codes, stripped);

    if (idx !== -1) {
      codes.splice(idx, 1);
      user.set('totp_backup_codes', JSON.stringify(codes));
      isValid = true;
    }
  } else {
    isValid = verifyTOTP(secret, code);
  }

  if (!isValid) {
    return e.json(401, { error: 'Invalid verification code' });
  }

  clearTotpLoginChallenge(user);
  $app.save(user);

  return e.json(200, {
    token: user.newAuthToken(),
    record: user.publicExport(),
  });
});
