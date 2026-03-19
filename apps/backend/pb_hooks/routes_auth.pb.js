/// <reference path="../pb_data/types.d.ts" />

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
// TOTP UTILITIES (pure JS SHA-1 + HMAC-SHA-1 — RFC 6238)
// ================================================================

function _sha1(bytes) {
  let h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE,
    h3 = 0x10325476, h4 = 0xC3D2E1F0;

  const padded = bytes.slice();
  padded.push(0x80);
  while (padded.length % 64 !== 56) padded.push(0);

  // Append 64-bit big-endian bit length (msgLen always < 2^32 bits here)
  const bitLen = bytes.length * 8;
  padded.push(0, 0, 0, 0);
  padded.push((bitLen >>> 24) & 0xFF, (bitLen >>> 16) & 0xFF,
    (bitLen >>> 8) & 0xFF, bitLen & 0xFF);

  for (let i = 0; i < padded.length; i += 64) {
    const w = new Array(80);
    for (let j = 0; j < 16; j++) {
      const b = i + j * 4;
      w[j] = ((padded[b] << 24) | (padded[b + 1] << 16) |
        (padded[b + 2] << 8) | padded[b + 3]) | 0;
    }
    for (let j = 16; j < 80; j++) {
      const n = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w[j] = ((n << 1) | (n >>> 31)) | 0;
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let j = 0; j < 80; j++) {
      let f, k;
      if (j < 20) { f = (b & c) | (~b & d); k = 0x5A827999; }
      else if (j < 40) { f = b ^ c ^ d; k = 0x6ED9EBA1; }
      else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8F1BBCDC; }
      else { f = b ^ c ^ d; k = 0xCA62C1D6; }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) | 0;
      e = d; d = c; c = ((b << 30) | (b >>> 2)) | 0; b = a; a = temp;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }

  return [
    (h0 >>> 24) & 0xFF, (h0 >>> 16) & 0xFF, (h0 >>> 8) & 0xFF, h0 & 0xFF,
    (h1 >>> 24) & 0xFF, (h1 >>> 16) & 0xFF, (h1 >>> 8) & 0xFF, h1 & 0xFF,
    (h2 >>> 24) & 0xFF, (h2 >>> 16) & 0xFF, (h2 >>> 8) & 0xFF, h2 & 0xFF,
    (h3 >>> 24) & 0xFF, (h3 >>> 16) & 0xFF, (h3 >>> 8) & 0xFF, h3 & 0xFF,
    (h4 >>> 24) & 0xFF, (h4 >>> 16) & 0xFF, (h4 >>> 8) & 0xFF, h4 & 0xFF,
  ];
}

function _hmacSha1(keyBytes, msgBytes) {
  const B = 64;
  let key = keyBytes.slice();
  if (key.length > B) key = _sha1(key);
  while (key.length < B) key.push(0);
  const ipad = key.map(function (b) { return b ^ 0x36; });
  const opad = key.map(function (b) { return b ^ 0x5C; });
  return _sha1(opad.concat(_sha1(ipad.concat(msgBytes))));
}

function _base32Decode(str) {
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  str = str.toUpperCase().replace(/[=\s]/g, "");
  const out = [];
  let buf = 0, bits = 0;
  for (let i = 0; i < str.length; i++) {
    const idx = alpha.indexOf(str[i]);
    if (idx === -1) continue;
    buf = (buf << 5) | idx;
    bits += 5;
    if (bits >= 8) { out.push((buf >> (bits - 8)) & 0xFF); bits -= 8; }
  }
  return out;
}

/**
 * Verifies a 6-digit TOTP code against a base32 secret.
 * Accepts ±1 time-step window to compensate for clock drift.
 */
function verifyTOTP(secret, code) {
  const key = _base32Decode(secret);
  const counter = Math.floor(Date.now() / 1000 / 30);
  for (let offset = -1; offset <= 1; offset++) {
    const c = counter + offset;
    // 8-byte big-endian counter (c fits in 32 bits for centuries to come)
    const msg = [0, 0, 0, 0,
      (c >>> 24) & 0xFF, (c >>> 16) & 0xFF, (c >>> 8) & 0xFF, c & 0xFF];
    const hash = _hmacSha1(key, msg);
    const pos = hash[19] & 0x0F;
    const otp = (((hash[pos] & 0x7F) << 24) |
      ((hash[pos + 1] & 0xFF) << 16) |
      ((hash[pos + 2] & 0xFF) << 8) |
      (hash[pos + 3] & 0xFF)) % 1000000;
    if (String(otp).padStart(6, "0") === String(code).trim()) return true;
  }
  return false;
}

/** Generates 8 backup codes in XXXX-XXXX format */
function generateBackupCodes() {
  const codes = [];
  const alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  for (let i = 0; i < 8; i++) {
    codes.push(
      $security.randomStringWithAlphabet(4, alpha) + "-" +
      $security.randomStringWithAlphabet(4, alpha)
    );
  }
  return codes;
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

  var a8 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var bc = [];
  for (var i = 0; i < 8; i++) {
    bc.push($security.randomStringWithAlphabet(4, a8) + '-' +
      $security.randomStringWithAlphabet(4, a8));
  }
  return e.json(200, { secret: secret, otpauthUri: uri, backupCodes: bc });
});

// ================================================================
// ROUTE: TOTP Verify — confirm code, then persist and enable 2FA
// ================================================================
routerAdd('POST', '/api/auth/totp/verify', function (e) {
  if (!e.auth) return e.json(401, { error: 'Authentication required' });

  function iSha1(bytes) {
    var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    var p = bytes.slice(); p.push(0x80);
    while (p.length % 64 !== 56) p.push(0);
    var bl = bytes.length * 8; p.push(0, 0, 0, 0, (bl >>> 24) & 0xFF, (bl >>> 16) & 0xFF, (bl >>> 8) & 0xFF, bl & 0xFF);
    for (var i = 0; i < p.length; i += 64) {
      var w = new Array(80);
      for (var j = 0; j < 16; j++) { var b = i + j * 4; w[j] = ((p[b] << 24) | (p[b + 1] << 16) | (p[b + 2] << 8) | p[b + 3]) | 0; }
      for (var j = 16; j < 80; j++) { var n = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]; w[j] = ((n << 1) | (n >>> 31)) | 0; }
      var ha = h0, hb = h1, hc = h2, hd = h3, he = h4;
      for (var j = 0; j < 80; j++) {
        var f, k;
        if (j < 20) { f = (hb & hc) | (~hb & hd); k = 0x5A827999; }
        else if (j < 40) { f = hb ^ hc ^ hd; k = 0x6ED9EBA1; }
        else if (j < 60) { f = (hb & hc) | (hb & hd) | (hc & hd); k = 0x8F1BBCDC; }
        else { f = hb ^ hc ^ hd; k = 0xCA62C1D6; }
        var t = (((ha << 5) | (ha >>> 27)) + f + he + k + w[j]) | 0;
        he = hd; hd = hc; hc = ((hb << 30) | (hb >>> 2)) | 0; hb = ha; ha = t;
      }
      h0 = (h0 + ha) | 0; h1 = (h1 + hb) | 0; h2 = (h2 + hc) | 0; h3 = (h3 + hd) | 0; h4 = (h4 + he) | 0;
    }
    return [(h0 >>> 24) & 0xFF, (h0 >>> 16) & 0xFF, (h0 >>> 8) & 0xFF, h0 & 0xFF,
    (h1 >>> 24) & 0xFF, (h1 >>> 16) & 0xFF, (h1 >>> 8) & 0xFF, h1 & 0xFF,
    (h2 >>> 24) & 0xFF, (h2 >>> 16) & 0xFF, (h2 >>> 8) & 0xFF, h2 & 0xFF,
    (h3 >>> 24) & 0xFF, (h3 >>> 16) & 0xFF, (h3 >>> 8) & 0xFF, h3 & 0xFF,
    (h4 >>> 24) & 0xFF, (h4 >>> 16) & 0xFF, (h4 >>> 8) & 0xFF, h4 & 0xFF];
  }
  function iHmac(key, msg) {
    var B = 64, k = key.slice();
    if (k.length > B) k = iSha1(k);
    while (k.length < B) k.push(0);
    var ip = k.map(function (x) { return x ^ 0x36; }), op = k.map(function (x) { return x ^ 0x5C; });
    return iSha1(op.concat(iSha1(ip.concat(msg))));
  }
  function ib32(s) {
    var al = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', out = [], buf = 0, bits = 0;
    s = s.toUpperCase().replace(/[=\s]/g, '');
    for (var ii = 0; ii < s.length; ii++) { var ix = al.indexOf(s[ii]); if (ix < 0) continue; buf = (buf << 5) | ix; bits += 5; if (bits >= 8) { out.push((buf >> (bits - 8)) & 0xFF); bits -= 8; } }
    return out;
  }
  function iTotp(sec, cod) {
    var key = ib32(sec), ctr = Math.floor(Date.now() / 1000 / 30);
    for (var off = -1; off <= 1; off++) {
      var c = ctr + off;
      var msg = [0, 0, 0, 0, (c >>> 24) & 0xFF, (c >>> 16) & 0xFF, (c >>> 8) & 0xFF, c & 0xFF];
      var h = iHmac(key, msg), pos = h[19] & 0x0F;
      var otp = (((h[pos] & 0x7F) << 24) | ((h[pos + 1] & 0xFF) << 16) | ((h[pos + 2] & 0xFF) << 8) | (h[pos + 3] & 0xFF)) % 1000000;
      if (String(otp).padStart(6, '0') === String(cod).trim()) return true;
    }
    return false;
  }

  var body = e.requestInfo().body;
  var code = String(body.code || '').trim();
  var secret = String(body.secret || '').trim();

  if (!code || !secret) return e.json(400, { error: 'Missing code or secret' });
  if (!iTotp(secret, code)) return e.json(400, { error: 'Invalid verification code' });

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

  function iSha1(bytes) {
    var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    var p = bytes.slice(); p.push(0x80);
    while (p.length % 64 !== 56) p.push(0);
    var bl = bytes.length * 8; p.push(0, 0, 0, 0, (bl >>> 24) & 0xFF, (bl >>> 16) & 0xFF, (bl >>> 8) & 0xFF, bl & 0xFF);
    for (var i = 0; i < p.length; i += 64) {
      var w = new Array(80);
      for (var j = 0; j < 16; j++) { var b = i + j * 4; w[j] = ((p[b] << 24) | (p[b + 1] << 16) | (p[b + 2] << 8) | p[b + 3]) | 0; }
      for (var j = 16; j < 80; j++) { var n = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]; w[j] = ((n << 1) | (n >>> 31)) | 0; }
      var ha = h0, hb = h1, hc = h2, hd = h3, he = h4;
      for (var j = 0; j < 80; j++) {
        var f, k;
        if (j < 20) { f = (hb & hc) | (~hb & hd); k = 0x5A827999; }
        else if (j < 40) { f = hb ^ hc ^ hd; k = 0x6ED9EBA1; }
        else if (j < 60) { f = (hb & hc) | (hb & hd) | (hc & hd); k = 0x8F1BBCDC; }
        else { f = hb ^ hc ^ hd; k = 0xCA62C1D6; }
        var t = (((ha << 5) | (ha >>> 27)) + f + he + k + w[j]) | 0;
        he = hd; hd = hc; hc = ((hb << 30) | (hb >>> 2)) | 0; hb = ha; ha = t;
      }
      h0 = (h0 + ha) | 0; h1 = (h1 + hb) | 0; h2 = (h2 + hc) | 0; h3 = (h3 + hd) | 0; h4 = (h4 + he) | 0;
    }
    return [(h0 >>> 24) & 0xFF, (h0 >>> 16) & 0xFF, (h0 >>> 8) & 0xFF, h0 & 0xFF,
    (h1 >>> 24) & 0xFF, (h1 >>> 16) & 0xFF, (h1 >>> 8) & 0xFF, h1 & 0xFF,
    (h2 >>> 24) & 0xFF, (h2 >>> 16) & 0xFF, (h2 >>> 8) & 0xFF, h2 & 0xFF,
    (h3 >>> 24) & 0xFF, (h3 >>> 16) & 0xFF, (h3 >>> 8) & 0xFF, h3 & 0xFF,
    (h4 >>> 24) & 0xFF, (h4 >>> 16) & 0xFF, (h4 >>> 8) & 0xFF, h4 & 0xFF];
  }
  function iHmac(key, msg) {
    var B = 64, k = key.slice();
    if (k.length > B) k = iSha1(k);
    while (k.length < B) k.push(0);
    var ip = k.map(function (x) { return x ^ 0x36; }), op = k.map(function (x) { return x ^ 0x5C; });
    return iSha1(op.concat(iSha1(ip.concat(msg))));
  }
  function ib32(s) {
    var al = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', out = [], buf = 0, bits = 0;
    s = s.toUpperCase().replace(/[=\s]/g, '');
    for (var ii = 0; ii < s.length; ii++) { var ix = al.indexOf(s[ii]); if (ix < 0) continue; buf = (buf << 5) | ix; bits += 5; if (bits >= 8) { out.push((buf >> (bits - 8)) & 0xFF); bits -= 8; } }
    return out;
  }
  function iTotp(sec, cod) {
    var key = ib32(sec), ctr = Math.floor(Date.now() / 1000 / 30);
    for (var off = -1; off <= 1; off++) {
      var c = ctr + off;
      var msg = [0, 0, 0, 0, (c >>> 24) & 0xFF, (c >>> 16) & 0xFF, (c >>> 8) & 0xFF, c & 0xFF];
      var h = iHmac(key, msg), pos = h[19] & 0x0F;
      var otp = (((h[pos] & 0x7F) << 24) | ((h[pos + 1] & 0xFF) << 16) | ((h[pos + 2] & 0xFF) << 8) | (h[pos + 3] & 0xFF)) % 1000000;
      if (String(otp).padStart(6, '0') === String(cod).trim()) return true;
    }
    return false;
  }

  var body = e.requestInfo().body;
  var code = String(body.code || '').trim();
  var user = $app.findRecordById('users', e.auth.id);
  var secret = String(user.get('totp_secret') || '');
  var ok = iTotp(secret, code);

  if (!ok) {
    var saved = [];
    try { saved = JSON.parse(String(user.get('totp_backup_codes') || '[]')); } catch (_) { }
    var upper = code.toUpperCase();
    var idx = saved.indexOf(upper);
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

  function iSha1(bytes) {
    var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    var p = bytes.slice(); p.push(0x80);
    while (p.length % 64 !== 56) p.push(0);
    var bl = bytes.length * 8; p.push(0, 0, 0, 0, (bl >>> 24) & 0xFF, (bl >>> 16) & 0xFF, (bl >>> 8) & 0xFF, bl & 0xFF);
    for (var i = 0; i < p.length; i += 64) {
      var w = new Array(80);
      for (var j = 0; j < 16; j++) { var b = i + j * 4; w[j] = ((p[b] << 24) | (p[b + 1] << 16) | (p[b + 2] << 8) | p[b + 3]) | 0; }
      for (var j = 16; j < 80; j++) { var n = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]; w[j] = ((n << 1) | (n >>> 31)) | 0; }
      var ha = h0, hb = h1, hc = h2, hd = h3, he = h4;
      for (var j = 0; j < 80; j++) {
        var f, k;
        if (j < 20) { f = (hb & hc) | (~hb & hd); k = 0x5A827999; }
        else if (j < 40) { f = hb ^ hc ^ hd; k = 0x6ED9EBA1; }
        else if (j < 60) { f = (hb & hc) | (hb & hd) | (hc & hd); k = 0x8F1BBCDC; }
        else { f = hb ^ hc ^ hd; k = 0xCA62C1D6; }
        var t = (((ha << 5) | (ha >>> 27)) + f + he + k + w[j]) | 0;
        he = hd; hd = hc; hc = ((hb << 30) | (hb >>> 2)) | 0; hb = ha; ha = t;
      }
      h0 = (h0 + ha) | 0; h1 = (h1 + hb) | 0; h2 = (h2 + hc) | 0; h3 = (h3 + hd) | 0; h4 = (h4 + he) | 0;
    }
    return [(h0 >>> 24) & 0xFF, (h0 >>> 16) & 0xFF, (h0 >>> 8) & 0xFF, h0 & 0xFF,
    (h1 >>> 24) & 0xFF, (h1 >>> 16) & 0xFF, (h1 >>> 8) & 0xFF, h1 & 0xFF,
    (h2 >>> 24) & 0xFF, (h2 >>> 16) & 0xFF, (h2 >>> 8) & 0xFF, h2 & 0xFF,
    (h3 >>> 24) & 0xFF, (h3 >>> 16) & 0xFF, (h3 >>> 8) & 0xFF, h3 & 0xFF,
    (h4 >>> 24) & 0xFF, (h4 >>> 16) & 0xFF, (h4 >>> 8) & 0xFF, h4 & 0xFF];
  }
  function iHmac(key, msg) {
    var B = 64, k = key.slice();
    if (k.length > B) k = iSha1(k);
    while (k.length < B) k.push(0);
    var ip = k.map(function (x) { return x ^ 0x36; }), op = k.map(function (x) { return x ^ 0x5C; });
    return iSha1(op.concat(iSha1(ip.concat(msg))));
  }
  function ib32(s) {
    var al = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', out = [], buf = 0, bits = 0;
    s = s.toUpperCase().replace(/[=\s]/g, '');
    for (var ii = 0; ii < s.length; ii++) { var ix = al.indexOf(s[ii]); if (ix < 0) continue; buf = (buf << 5) | ix; bits += 5; if (bits >= 8) { out.push((buf >> (bits - 8)) & 0xFF); bits -= 8; } }
    return out;
  }
  function iTotp(sec, cod) {
    var key = ib32(sec), ctr = Math.floor(Date.now() / 1000 / 30);
    for (var off = -1; off <= 1; off++) {
      var c = ctr + off;
      var msg = [0, 0, 0, 0, (c >>> 24) & 0xFF, (c >>> 16) & 0xFF, (c >>> 8) & 0xFF, c & 0xFF];
      var h = iHmac(key, msg), pos = h[19] & 0x0F;
      var otp = (((h[pos] & 0x7F) << 24) | ((h[pos + 1] & 0xFF) << 16) | ((h[pos + 2] & 0xFF) << 8) | (h[pos + 3] & 0xFF)) % 1000000;
      if (String(otp).padStart(6, '0') === String(cod).trim()) return true;
    }
    return false;
  }

  var body = e.requestInfo().body;
  var code = String(body.code || '').trim();
  var user = $app.findRecordById('users', e.auth.id);
  var secret = String(user.get('totp_secret') || '');
  if (!secret) return e.json(400, { error: '2FA is not configured' });
  if (!iTotp(secret, code)) return e.json(400, { error: 'Invalid code' });
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

  function iSha1(bytes) {
    var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    var p = bytes.slice(); p.push(0x80);
    while (p.length % 64 !== 56) p.push(0);
    var bl = bytes.length * 8; p.push(0, 0, 0, 0, (bl >>> 24) & 0xFF, (bl >>> 16) & 0xFF, (bl >>> 8) & 0xFF, bl & 0xFF);
    for (var i = 0; i < p.length; i += 64) {
      var w = new Array(80);
      for (var j = 0; j < 16; j++) { var b = i + j * 4; w[j] = ((p[b] << 24) | (p[b + 1] << 16) | (p[b + 2] << 8) | p[b + 3]) | 0; }
      for (var j = 16; j < 80; j++) { var n = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]; w[j] = ((n << 1) | (n >>> 31)) | 0; }
      var ha = h0, hb = h1, hc = h2, hd = h3, he = h4;
      for (var j = 0; j < 80; j++) {
        var f, k;
        if (j < 20) { f = (hb & hc) | (~hb & hd); k = 0x5A827999; }
        else if (j < 40) { f = hb ^ hc ^ hd; k = 0x6ED9EBA1; }
        else if (j < 60) { f = (hb & hc) | (hb & hd) | (hc & hd); k = 0x8F1BBCDC; }
        else { f = hb ^ hc ^ hd; k = 0xCA62C1D6; }
        var t = (((ha << 5) | (ha >>> 27)) + f + he + k + w[j]) | 0;
        he = hd; hd = hc; hc = ((hb << 30) | (hb >>> 2)) | 0; hb = ha; ha = t;
      }
      h0 = (h0 + ha) | 0; h1 = (h1 + hb) | 0; h2 = (h2 + hc) | 0; h3 = (h3 + hd) | 0; h4 = (h4 + he) | 0;
    }
    return [(h0 >>> 24) & 0xFF, (h0 >>> 16) & 0xFF, (h0 >>> 8) & 0xFF, h0 & 0xFF,
    (h1 >>> 24) & 0xFF, (h1 >>> 16) & 0xFF, (h1 >>> 8) & 0xFF, h1 & 0xFF,
    (h2 >>> 24) & 0xFF, (h2 >>> 16) & 0xFF, (h2 >>> 8) & 0xFF, h2 & 0xFF,
    (h3 >>> 24) & 0xFF, (h3 >>> 16) & 0xFF, (h3 >>> 8) & 0xFF, h3 & 0xFF,
    (h4 >>> 24) & 0xFF, (h4 >>> 16) & 0xFF, (h4 >>> 8) & 0xFF, h4 & 0xFF];
  }
  function iHmac(key, msg) {
    var B = 64, k = key.slice();
    if (k.length > B) k = iSha1(k);
    while (k.length < B) k.push(0);
    var ip = k.map(function (x) { return x ^ 0x36; }), op = k.map(function (x) { return x ^ 0x5C; });
    return iSha1(op.concat(iSha1(ip.concat(msg))));
  }
  function ib32(s) {
    var al = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', out = [], buf = 0, bits = 0;
    s = s.toUpperCase().replace(/[=\s]/g, '');
    for (var ii = 0; ii < s.length; ii++) { var ix = al.indexOf(s[ii]); if (ix < 0) continue; buf = (buf << 5) | ix; bits += 5; if (bits >= 8) { out.push((buf >> (bits - 8)) & 0xFF); bits -= 8; } }
    return out;
  }
  function iTotp(sec, cod) {
    var key = ib32(sec), ctr = Math.floor(Date.now() / 1000 / 30);
    for (var off = -1; off <= 1; off++) {
      var c = ctr + off;
      var msg = [0, 0, 0, 0, (c >>> 24) & 0xFF, (c >>> 16) & 0xFF, (c >>> 8) & 0xFF, c & 0xFF];
      var h = iHmac(key, msg), pos = h[19] & 0x0F;
      var otp = (((h[pos] & 0x7F) << 24) | ((h[pos + 1] & 0xFF) << 16) | ((h[pos + 2] & 0xFF) << 8) | (h[pos + 3] & 0xFF)) % 1000000;
      if (String(otp).padStart(6, '0') === String(cod).trim()) return true;
    }
    return false;
  }

  var body = e.requestInfo().body;
  var code = String(body.code || '').trim();
  var user = $app.findRecordById('users', e.auth.id);
  var secret = String(user.get('totp_secret') || '');
  var ok = iTotp(secret, code);

  if (!ok) {
    var saved = [];
    try { saved = JSON.parse(String(user.get('totp_backup_codes') || '[]')); } catch (_) { }
    var stripped = code.replace(/-/g, '').toUpperCase();
    for (var ci = 0; ci < saved.length; ci++) {
      if (String(saved[ci]).replace(/-/g, '').toUpperCase() === stripped) { ok = true; break; }
    }
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

  function iSha1(bytes) {
    var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    var p = bytes.slice(); p.push(0x80);
    while (p.length % 64 !== 56) p.push(0);
    var bl = bytes.length * 8; p.push(0, 0, 0, 0, (bl >>> 24) & 0xFF, (bl >>> 16) & 0xFF, (bl >>> 8) & 0xFF, bl & 0xFF);
    for (var i = 0; i < p.length; i += 64) {
      var w = new Array(80);
      for (var j = 0; j < 16; j++) { var b = i + j * 4; w[j] = ((p[b] << 24) | (p[b + 1] << 16) | (p[b + 2] << 8) | p[b + 3]) | 0; }
      for (var j = 16; j < 80; j++) { var n = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]; w[j] = ((n << 1) | (n >>> 31)) | 0; }
      var ha = h0, hb = h1, hc = h2, hd = h3, he = h4;
      for (var j = 0; j < 80; j++) {
        var f, k;
        if (j < 20) { f = (hb & hc) | (~hb & hd); k = 0x5A827999; }
        else if (j < 40) { f = hb ^ hc ^ hd; k = 0x6ED9EBA1; }
        else if (j < 60) { f = (hb & hc) | (hb & hd) | (hc & hd); k = 0x8F1BBCDC; }
        else { f = hb ^ hc ^ hd; k = 0xCA62C1D6; }
        var t = (((ha << 5) | (ha >>> 27)) + f + he + k + w[j]) | 0;
        he = hd; hd = hc; hc = ((hb << 30) | (hb >>> 2)) | 0; hb = ha; ha = t;
      }
      h0 = (h0 + ha) | 0; h1 = (h1 + hb) | 0; h2 = (h2 + hc) | 0; h3 = (h3 + hd) | 0; h4 = (h4 + he) | 0;
    }
    return [(h0 >>> 24) & 0xFF, (h0 >>> 16) & 0xFF, (h0 >>> 8) & 0xFF, h0 & 0xFF,
    (h1 >>> 24) & 0xFF, (h1 >>> 16) & 0xFF, (h1 >>> 8) & 0xFF, h1 & 0xFF,
    (h2 >>> 24) & 0xFF, (h2 >>> 16) & 0xFF, (h2 >>> 8) & 0xFF, h2 & 0xFF,
    (h3 >>> 24) & 0xFF, (h3 >>> 16) & 0xFF, (h3 >>> 8) & 0xFF, h3 & 0xFF,
    (h4 >>> 24) & 0xFF, (h4 >>> 16) & 0xFF, (h4 >>> 8) & 0xFF, h4 & 0xFF];
  }
  function iHmac(key, msg) {
    var B = 64, k = key.slice();
    if (k.length > B) k = iSha1(k);
    while (k.length < B) k.push(0);
    var ip = k.map(function (x) { return x ^ 0x36; }), op = k.map(function (x) { return x ^ 0x5C; });
    return iSha1(op.concat(iSha1(ip.concat(msg))));
  }
  function ib32(s) {
    var al = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', out = [], buf = 0, bits = 0;
    s = s.toUpperCase().replace(/[=\s]/g, '');
    for (var ii = 0; ii < s.length; ii++) { var ix = al.indexOf(s[ii]); if (ix < 0) continue; buf = (buf << 5) | ix; bits += 5; if (bits >= 8) { out.push((buf >> (bits - 8)) & 0xFF); bits -= 8; } }
    return out;
  }
  function iTotp(sec, cod) {
    var key = ib32(sec), ctr = Math.floor(Date.now() / 1000 / 30);
    for (var off = -1; off <= 1; off++) {
      var c = ctr + off;
      var msg = [0, 0, 0, 0, (c >>> 24) & 0xFF, (c >>> 16) & 0xFF, (c >>> 8) & 0xFF, c & 0xFF];
      var h = iHmac(key, msg), pos = h[19] & 0x0F;
      var otp = (((h[pos] & 0x7F) << 24) | ((h[pos + 1] & 0xFF) << 16) | ((h[pos + 2] & 0xFF) << 8) | (h[pos + 3] & 0xFF)) % 1000000;
      if (String(otp).padStart(6, '0') === String(cod).trim()) return true;
    }
    return false;
  }

  var body = e.requestInfo().body;
  var code = String(body.code || '').trim();
  var user = $app.findRecordById('users', e.auth.id);
  var secret = String(user.get('totp_secret') || '');

  if (!iTotp(secret, code)) return e.json(400, { error: 'Invalid code' });

  var a8 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  var nbc = [];
  for (var i = 0; i < 8; i++) {
    nbc.push($security.randomStringWithAlphabet(4, a8) + '-' +
      $security.randomStringWithAlphabet(4, a8));
  }
  user.set('totp_backup_codes', JSON.stringify(nbc));
  $app.save(user);
  return e.json(200, { backupCodes: nbc });
});

// ================================================================
// ROUTE: TOTP Login Verify — called after authWithPassword succeeds
// Requires the fresh PocketBase session; verifies TOTP/backup code.
// ================================================================
routerAdd('POST', '/api/auth/totp/login-verify', function (e) {
  if (!e.auth) return e.json(401, { error: 'Authentication required' });

  function iSha1(bytes) {
    var h0 = 0x67452301, h1 = 0xEFCDAB89, h2 = 0x98BADCFE, h3 = 0x10325476, h4 = 0xC3D2E1F0;
    var p = bytes.slice(); p.push(0x80);
    while (p.length % 64 !== 56) p.push(0);
    var bl = bytes.length * 8; p.push(0, 0, 0, 0, (bl >>> 24) & 0xFF, (bl >>> 16) & 0xFF, (bl >>> 8) & 0xFF, bl & 0xFF);
    for (var i = 0; i < p.length; i += 64) {
      var w = new Array(80);
      for (var j = 0; j < 16; j++) { var b = i + j * 4; w[j] = ((p[b] << 24) | (p[b + 1] << 16) | (p[b + 2] << 8) | p[b + 3]) | 0; }
      for (var j = 16; j < 80; j++) { var n = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16]; w[j] = ((n << 1) | (n >>> 31)) | 0; }
      var ha = h0, hb = h1, hc = h2, hd = h3, he = h4;
      for (var j = 0; j < 80; j++) {
        var f, k;
        if (j < 20) { f = (hb & hc) | (~hb & hd); k = 0x5A827999; }
        else if (j < 40) { f = hb ^ hc ^ hd; k = 0x6ED9EBA1; }
        else if (j < 60) { f = (hb & hc) | (hb & hd) | (hc & hd); k = 0x8F1BBCDC; }
        else { f = hb ^ hc ^ hd; k = 0xCA62C1D6; }
        var t = (((ha << 5) | (ha >>> 27)) + f + he + k + w[j]) | 0;
        he = hd; hd = hc; hc = ((hb << 30) | (hb >>> 2)) | 0; hb = ha; ha = t;
      }
      h0 = (h0 + ha) | 0; h1 = (h1 + hb) | 0; h2 = (h2 + hc) | 0; h3 = (h3 + hd) | 0; h4 = (h4 + he) | 0;
    }
    return [(h0 >>> 24) & 0xFF, (h0 >>> 16) & 0xFF, (h0 >>> 8) & 0xFF, h0 & 0xFF,
    (h1 >>> 24) & 0xFF, (h1 >>> 16) & 0xFF, (h1 >>> 8) & 0xFF, h1 & 0xFF,
    (h2 >>> 24) & 0xFF, (h2 >>> 16) & 0xFF, (h2 >>> 8) & 0xFF, h2 & 0xFF,
    (h3 >>> 24) & 0xFF, (h3 >>> 16) & 0xFF, (h3 >>> 8) & 0xFF, h3 & 0xFF,
    (h4 >>> 24) & 0xFF, (h4 >>> 16) & 0xFF, (h4 >>> 8) & 0xFF, h4 & 0xFF];
  }
  function iHmac(key, msg) {
    var B = 64, k = key.slice();
    if (k.length > B) k = iSha1(k);
    while (k.length < B) k.push(0);
    var ip = k.map(function (x) { return x ^ 0x36; }), op = k.map(function (x) { return x ^ 0x5C; });
    return iSha1(op.concat(iSha1(ip.concat(msg))));
  }
  function ib32(s) {
    var al = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567', out = [], buf = 0, bits = 0;
    s = s.toUpperCase().replace(/[=\s]/g, '');
    for (var ii = 0; ii < s.length; ii++) { var ix = al.indexOf(s[ii]); if (ix < 0) continue; buf = (buf << 5) | ix; bits += 5; if (bits >= 8) { out.push((buf >> (bits - 8)) & 0xFF); bits -= 8; } }
    return out;
  }
  function iTotp(sec, cod) {
    var key = ib32(sec), ctr = Math.floor(Date.now() / 1000 / 30);
    for (var off = -1; off <= 1; off++) {
      var c = ctr + off;
      var msg = [0, 0, 0, 0, (c >>> 24) & 0xFF, (c >>> 16) & 0xFF, (c >>> 8) & 0xFF, c & 0xFF];
      var h = iHmac(key, msg), pos = h[19] & 0x0F;
      var otp = (((h[pos] & 0x7F) << 24) | ((h[pos + 1] & 0xFF) << 16) | ((h[pos + 2] & 0xFF) << 8) | (h[pos + 3] & 0xFF)) % 1000000;
      if (String(otp).padStart(6, '0') === String(cod).trim()) return true;
    }
    return false;
  }

  var body = e.requestInfo().body;
  var code = String(body.code || '').replace(/\s/g, '');
  if (!code) return e.json(400, { error: 'code is required' });

  var user = $app.findRecordById('users', e.auth.id);
  var secret = String(user.get('totp_secret') || '');

  var stripped = code.replace(/-/g, '');
  if (stripped.length >= 8) {
    // Backup code path
    var rawCodes = String(user.get('totp_backup_codes') || '[]');
    var codes = [];
    try { codes = JSON.parse(rawCodes); } catch (_) { }
    var idx = -1;
    for (var ci = 0; ci < codes.length; ci++) {
      if (String(codes[ci]).replace(/-/g, '') === stripped) { idx = ci; break; }
    }
    if (idx === -1) return e.json(401, { error: 'Invalid code' });
    codes.splice(idx, 1);
    user.set('totp_backup_codes', JSON.stringify(codes));
    $app.save(user);
  } else {
    if (!iTotp(secret, code)) {
      return e.json(401, { error: 'Invalid verification code' });
    }
  }

  return e.json(200, { message: 'OK' });
});
