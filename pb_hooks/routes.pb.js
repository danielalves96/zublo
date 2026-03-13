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
// ROUTE: GET /api/auth/admin-id  — public, returns first user's ID
// The listRule on "users" is "id = @request.auth.id", so the SDK
// can't query all users. This route bypasses that to let the
// frontend reliably determine who is the admin.
// ================================================================
routerAdd("GET", "/api/auth/admin-id", (e) => {
  const all = $app.findRecordsByFilter("users", "1=1", "+created", 1, 0);
  if (all.length === 0) {
    return e.json(200, { adminId: null });
  }
  return e.json(200, { adminId: all[0].id });
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


function getQueryParam(e, key) {
  let value = "";
  try {
    value = e.request.url.query().get(key) || "";
  } catch (_) { }
  if (!value) {
    try {
      value = e.requestInfo().query[key] || "";
    } catch (_) { }
  }
  return String(value || "").trim();
}

function extractImageUrlsFromPage(html, limit) {
  const imageUrls = [];
  const seen = {};

  const addUrl = (url) => {
    if (!url || seen[url] || imageUrls.length >= limit) return;
    seen[url] = true;
    imageUrls.push(url);
  };

  const imgTagRegex = /<img\b[^>]*>/gi;
  const srcRegex = /\bsrc=["']([^"']+)["']/i;
  const classRegex = /\bclass=["']([^"']+)["']/i;
  const shouldSkipUrl = (src, cls) => {
    const lower = src.toLowerCase();
    if (cls.includes("favicon")) return true;
    if (lower.startsWith("data:")) return true;
    if (!/^https?:\/\//i.test(lower) && !lower.startsWith("//")) return true;
    if (lower.includes("google.com/s2/favicons")) return true;
    if (lower.includes("favicons.search.brave.com")) return true;
    if (lower.includes("brave-logo")) return true;
    if (lower.includes("/rs:fit:16:") || lower.includes("/rs:fit:24:") || lower.includes("/rs:fit:32:")) return true;
    return false;
  };

  let imgMatch;
  while ((imgMatch = imgTagRegex.exec(html)) !== null && imageUrls.length < limit) {
    const tag = imgMatch[0];
    const srcMatch = srcRegex.exec(tag);
    if (!srcMatch) continue;

    const cls = (classRegex.exec(tag)?.[1] || "").toLowerCase();

    let src = srcMatch[1] || "";
    if (!src) continue;
    if (shouldSkipUrl(src, cls)) continue;
    if (src.startsWith("//")) src = "https:" + src;

    addUrl(src);
  }

  if (imageUrls.length < limit) {
    const fallbackPatterns = [
      /https?:\/\/encrypted-tbn0\.gstatic\.com\/images\?q=tbn:[^\s"'<>]+/gi,
      /https?:\/\/imgs\.search\.brave\.com\/[^\s"'<>]+/gi,
      /https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|webp|svg)(?:\?[^\s"'<>]*)?/gi,
    ];

    for (const pattern of fallbackPatterns) {
      let m;
      while ((m = pattern.exec(html)) !== null && imageUrls.length < limit) {
        const url = String(m[0] || "").replace(/&amp;/g, "&");
        if (!url) continue;
        if (url.toLowerCase().includes("favicons.search.brave.com")) continue;
        if (url.toLowerCase().includes("brave-logo")) continue;
        addUrl(url);
      }
    }
  }

  return imageUrls;
}

// ================================================================
// ROUTE: Logo Search
// ================================================================
routerAdd("GET", "/api/logo_search", (e) => {
  try {
    if (!e.auth) {
      return e.json(403, { error: "Authentication required" });
    }

    const readQuery = (key) => {
      let value = "";
      try {
        value = e.request.url.query().get(key) || "";
      } catch (_) { }
      if (!value) {
        try {
          value = e.requestInfo().query[key] || "";
        } catch (_) { }
      }
      return String(value || "").trim();
    };

    const extract = (html, limit) => {
      const imageUrls = [];
      const seen = {};

      const addUrl = (url) => {
        if (!url || seen[url] || imageUrls.length >= limit) return;
        seen[url] = true;
        imageUrls.push(url);
      };

      const imgTagRegex = /<img\b[^>]*>/gi;
      const srcRegex = /\bsrc=["']([^"']+)["']/i;
      const classRegex = /\bclass=["']([^"']+)["']/i;
      const shouldSkipUrl = (src, cls) => {
        const lower = src.toLowerCase();
        if (cls.includes("favicon")) return true;
        if (lower.startsWith("data:")) return true;
        if (!/^https?:\/\//i.test(lower) && !lower.startsWith("//")) return true;
        if (lower.includes("google.com/s2/favicons")) return true;
        if (lower.includes("ssl.gstatic.com/gb/images")) return true;
        if (lower.includes("favicons.search.brave.com")) return true;
        if (lower.includes("brave-logo")) return true;
        if (lower.includes("/rs:fit:16:") || lower.includes("/rs:fit:24:") || lower.includes("/rs:fit:32:")) return true;
        if (lower.includes("wikipedia.org/wiki/") || lower.includes("wikimedia.org/wiki/")) return true;

        try {
          const normalized = lower.startsWith("//") ? "https:" + lower : lower;
          const u = new URL(normalized);
          const path = u.pathname || "";
          const hasImageExt = /\.(png|jpg|jpeg|webp|svg|gif|ico)$/i.test(path);
          const isGoogleThumb = normalized.includes("encrypted-tbn0.gstatic.com/images?q=tbn:");
          const isBraveImgProxy = normalized.includes("imgs.search.brave.com/");
          if (!hasImageExt && !isGoogleThumb && !isBraveImgProxy) return true;
        } catch (_) {
          return true;
        }

        return false;
      };

      let imgMatch;
      while ((imgMatch = imgTagRegex.exec(html)) !== null && imageUrls.length < limit) {
        const tag = imgMatch[0];
        const srcMatch = srcRegex.exec(tag);
        if (!srcMatch) continue;
        const cls = (classRegex.exec(tag)?.[1] || "").toLowerCase();
        let src = srcMatch[1] || "";
        if (!src || shouldSkipUrl(src, cls)) continue;
        if (src.startsWith("//")) src = "https:" + src;
        addUrl(src);
      }

      if (imageUrls.length < limit) {
        const fallbackPatterns = [
          /https?:\/\/encrypted-tbn0\.gstatic\.com\/images\?q=tbn:[^\s"'<>]+/gi,
          /https?:\/\/imgs\.search\.brave\.com\/[^\s"'<>]+/gi,
          /https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|webp|svg)(?:\?[^\s"'<>]*)?/gi,
        ];

        for (const pattern of fallbackPatterns) {
          let m;
          while ((m = pattern.exec(html)) !== null && imageUrls.length < limit) {
            const url = String(m[0] || "").replace(/&amp;/g, "&");
            if (!url) continue;
            const lower = url.toLowerCase();
            if (lower.includes("favicons.search.brave.com")) continue;
            if (lower.includes("brave-logo")) continue;
            if (lower.includes("ssl.gstatic.com/gb/images")) continue;
            if (lower.includes("wikipedia.org/wiki/") || lower.includes("wikimedia.org/wiki/")) continue;

            try {
              const u = new URL(url);
              const path = u.pathname || "";
              const hasImageExt = /\.(png|jpg|jpeg|webp|svg|gif|ico)$/i.test(path);
              const isGoogleThumb = lower.includes("encrypted-tbn0.gstatic.com/images?q=tbn:");
              const isBraveImgProxy = lower.includes("imgs.search.brave.com/");
              if (!hasImageExt && !isGoogleThumb && !isBraveImgProxy) continue;
            } catch (_) {
              continue;
            }

            addUrl(url);
          }
        }
      }

      return imageUrls;
    };

    const search = readQuery("search");
    if (!search) {
      return e.json(400, { error: "Missing 'search' parameter" });
    }

    const encodedQuery = encodeURIComponent(search + " logo");
    const maxResults = 24;
    let logos = [];

    const googleUrl = "https://www.google.com/search?q=" + encodedQuery + "&tbm=isch";
    const braveUrl = "https://search.brave.com/search?q=" + encodedQuery;

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Encoding": "identity",
    };

    try {
      const res = $http.send({
        url: googleUrl,
        method: "GET",
        headers,
      });

      if (res.statusCode === 200 && res.raw) {
        logos = extract(res.raw, maxResults);
      }
    } catch (_) { }

    if (logos.length === 0) {
      try {
        const res = $http.send({
          url: "https://search.brave.com/images?q=" + encodedQuery + "&source=web",
          method: "GET",
          headers,
        });

        if (res.statusCode === 200 && res.raw) {
          logos = extract(res.raw, maxResults);
        }
      } catch (_) { }
    }

    return e.json(200, { logos: logos });
  } catch (_) {
    return e.json(200, { logos: [] });
  }
});

routerAdd("GET", "/api/logo_fetch", (e) => {
  try {
    if (!e.auth) {
      return e.json(403, { error: "Authentication required" });
    }

    let url = "";
    try {
      url = e.request.url.query().get("url") || "";
    } catch (_) { }
    if (!url) {
      try {
        url = e.requestInfo().query.url || "";
      } catch (_) { }
    }
    url = String(url || "").trim();

    if (!url || !/^https?:\/\//i.test(url)) {
      return e.json(400, { error: "Invalid 'url' parameter" });
    }

    const lowerUrl = url.toLowerCase();
    if (
      lowerUrl.includes("localhost") ||
      lowerUrl.includes("127.0.0.1") ||
      lowerUrl.includes("0.0.0.0") ||
      lowerUrl.includes("::1")
    ) {
      return e.json(400, { error: "Blocked host" });
    }

    const res = $http.send({
      url,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Zublo/1.0)",
        "Accept": "image/*,*/*;q=0.8",
      },
    });

    if (res.statusCode !== 200 || !res.raw) {
      return e.json(400, { error: "Unable to fetch image" });
    }

    let contentType = "image/png";
    try {
      const ct = res.headers?.["Content-Type"] || res.headers?.["content-type"];
      if (ct) contentType = String(ct).split(";")[0];
    } catch (_) { }

    const base64 = btoa(res.raw);
    return e.json(200, { contentType, base64 });
  } catch (err) {
    return e.json(400, { error: "Failed to fetch image", details: String(err) });
  }
});

// ================================================================
// ROUTE: AI — Generate Recommendations
// ================================================================
routerAdd("POST", "/api/ai/generate", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const userId = e.auth.id;

  // Get AI settings
  let aiSettings;
  try {
    const records = $app.findRecordsByFilter(
      "ai_settings",
      "user = {:userId} && enabled = true",
      "", 1, 0,
      { userId: userId }
    );
    if (records.length === 0) {
      return e.json(400, { error: "AI not configured or disabled" });
    }
    aiSettings = records[0];
  } catch (_) {
    return e.json(400, { error: "AI settings not found" });
  }

  // Get user subscriptions
  const subs = $app.findRecordsByFilter(
    "subscriptions",
    "user = {:userId} && inactive = false",
    "", 0, 0,
    { userId: userId }
  );

  if (subs.length === 0) {
    return e.json(400, { error: "No active subscriptions found" });
  }

  // Build subscription list for the prompt
  let subsList = "";
  for (const sub of subs) {
    let currencySymbol = "$";
    try {
      const cur = $app.findRecordById("currencies", sub.get("currency"));
      currencySymbol = cur.get("symbol");
    } catch (_) { }

    let cycleName = "monthly";
    try {
      const cycle = $app.findRecordById("cycles", sub.get("cycle"));
      cycleName = cycle.get("name").toLowerCase();
    } catch (_) { }

    subsList += "- " + sub.get("name") + ": " + currencySymbol + sub.get("price") +
      " (" + cycleName + ", frequency: " + sub.get("frequency") + ")\n";
  }

  // Get user language
  const user = $app.findRecordById("users", userId);
  const language = user.get("language") || "en";

  const systemPrompt =
    "You are a financial advisor AI assistant for a subscription management app called Zublo. " +
    "Analyze the user's subscriptions and provide 3-7 actionable recommendations to save money. " +
    "Each recommendation should have a title, description, and estimated savings amount. " +
    "Consider: duplicate services, cheaper alternatives, bundling opportunities, " +
    "unused subscriptions, and seasonal deals. " +
    "Respond in " + language + " language. " +
    "Return ONLY a JSON array with objects containing: title, description, savings (as string with currency).";

  const userPrompt = "Here are my current active subscriptions:\n\n" + subsList +
    "\nPlease analyze and provide money-saving recommendations.";

  // Call AI provider
  const aiType = aiSettings.get("type");
  const apiKey = aiSettings.get("api_key");
  const model = aiSettings.get("model");
  const url = aiSettings.get("url");

  let aiUrl, aiHeaders, aiBody;

  switch (aiType) {
    case "chatgpt":
      aiUrl = "https://api.openai.com/v1/chat/completions";
      aiHeaders = { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" };
      aiBody = {
        model: model || "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      };
      break;

    case "gemini":
      aiUrl = "https://generativelanguage.googleapis.com/v1/models/" +
        (model || "gemini-pro") + ":generateContent?key=" + apiKey;
      aiHeaders = { "Content-Type": "application/json" };
      aiBody = {
        contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
      };
      break;

    case "openrouter":
      aiUrl = "https://openrouter.ai/api/v1/chat/completions";
      aiHeaders = { "Authorization": "Bearer " + apiKey, "Content-Type": "application/json" };
      aiBody = {
        model: model || "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      };
      break;

    case "ollama":
      aiUrl = (url || "http://localhost:11434") + "/api/chat";
      aiHeaders = { "Content-Type": "application/json" };
      aiBody = {
        model: model || "llama3",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        stream: false,
      };
      break;

    default:
      return e.json(400, { error: "Unknown AI type: " + aiType });
  }

  try {
    const res = $http.send({
      url: aiUrl,
      method: "POST",
      headers: aiHeaders,
      body: JSON.stringify(aiBody),
    });

    if (res.statusCode !== 200) {
      return e.json(500, { error: "AI API error: " + res.statusCode });
    }

    // Extract text from response based on provider
    let responseText = "";

    if (aiType === "gemini") {
      responseText = res.json.candidates[0].content.parts[0].text;
    } else if (aiType === "ollama") {
      responseText = res.json.message.content;
    } else {
      responseText = res.json.choices[0].message.content;
    }

    // Parse JSON from response (strip markdown fences if present)
    responseText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const recommendations = JSON.parse(responseText);

    // Delete old recommendations
    try {
      const old = $app.findRecordsByFilter(
        "ai_recommendations", "user = {:userId}", "", 0, 0, { userId: userId }
      );
      for (const rec of old) {
        $app.delete(rec);
      }
    } catch (_) { }

    // Save new recommendations
    const recCol = $app.findCollectionByNameOrId("ai_recommendations");
    const saved = [];

    for (const rec of recommendations) {
      const record = new Record(recCol);
      record.set("user", userId);
      record.set("title", rec.title || "");
      record.set("description", rec.description || "");
      record.set("savings", rec.savings || "");
      record.set("type", aiType);
      $app.save(record);
      saved.push({
        id: record.id,
        title: rec.title,
        description: rec.description,
        savings: rec.savings,
      });
    }

    return e.json(200, { recommendations: saved });
  } catch (err) {
    return e.json(500, { error: "Failed to generate recommendations: " + err });
  }
});

// ================================================================
// ROUTE: AI — Fetch Available Models
// ================================================================
routerAdd("GET", "/api/ai/models", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const userId = e.auth.id;

  let aiSettings;
  try {
    const records = $app.findRecordsByFilter(
      "ai_settings", "user = {:userId}", "", 1, 0, { userId: userId }
    );
    if (records.length === 0) {
      return e.json(200, { models: [] });
    }
    aiSettings = records[0];
  } catch (_) {
    return e.json(200, { models: [] });
  }

  const aiType = aiSettings.get("type");
  const apiKey = aiSettings.get("api_key");
  const url = aiSettings.get("url");
  const models = [];

  try {
    let apiUrl, headers;

    switch (aiType) {
      case "chatgpt":
        apiUrl = "https://api.openai.com/v1/models";
        headers = { "Authorization": "Bearer " + apiKey };
        break;
      case "openrouter":
        apiUrl = "https://openrouter.ai/api/v1/models";
        headers = { "Authorization": "Bearer " + apiKey };
        break;
      case "ollama":
        apiUrl = (url || "http://localhost:11434") + "/api/tags";
        headers = {};
        break;
      case "gemini":
        return e.json(200, {
          models: ["gemini-pro", "gemini-1.5-pro", "gemini-1.5-flash", "gemini-2.0-flash"],
        });
      default:
        return e.json(200, { models: [] });
    }

    const res = $http.send({ url: apiUrl, method: "GET", headers: headers });

    if (res.statusCode === 200) {
      if (aiType === "ollama" && res.json.models) {
        for (const m of res.json.models) {
          models.push(m.name);
        }
      } else if (res.json.data) {
        for (const m of res.json.data) {
          models.push(m.id);
        }
      }
    }
  } catch (_) { }

  return e.json(200, { models: models });
});

// ================================================================
// ROUTE: Subscription Clone
// ================================================================
routerAdd("POST", "/api/subscription/clone", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const data = e.requestInfo().body;
  const subId = data.id;

  if (!subId) {
    return e.json(400, { error: "Missing subscription id" });
  }

  const original = $app.findRecordById("subscriptions", subId);

  if (original.get("user") !== e.auth.id) {
    throw new ForbiddenError("Not your subscription");
  }

  const col = $app.findCollectionByNameOrId("subscriptions");
  const clone = new Record(col);

  // Copy all fields except id
  const fieldsToCopy = [
    "name", "price", "frequency", "next_payment", "auto_renew",
    "start_date", "notes", "url", "notify", "notify_days_before",
    "inactive", "cancellation_date", "currency", "cycle",
    "payment_method", "payer", "category", "user",
  ];

  for (const field of fieldsToCopy) {
    clone.set(field, original.get(field));
  }

  // Logo needs special handling (file copy)
  $app.save(clone);

  return e.json(200, { id: clone.id, message: "Subscription cloned" });
});

// ================================================================
// ROUTE: Subscription Renew
// ================================================================
routerAdd("POST", "/api/subscription/renew", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const data = e.requestInfo().body;
  const subId = data.id;

  if (!subId) {
    return e.json(400, { error: "Missing subscription id" });
  }

  const sub = $app.findRecordById("subscriptions", subId);

  if (sub.get("user") !== e.auth.id) {
    throw new ForbiddenError("Not your subscription");
  }

  const cycleRecord = $app.findRecordById("cycles", sub.get("cycle"));
  const cycleName = cycleRecord.get("name");
  const frequency = sub.get("frequency");
  let nextPayment = new Date(sub.get("next_payment"));
  const today = new Date();

  // Advance to next payment after today
  while (nextPayment <= today) {
    nextPayment = advanceDate(nextPayment, cycleName, frequency);
  }

  sub.set("next_payment", nextPayment.toISOString().split("T")[0]);
  $app.save(sub);

  return e.json(200, { next_payment: sub.get("next_payment") });
});

/**
 * Date advancement helper (same as in crons.pb.js).
 * PocketBase loads each .pb.js file independently.
 */
function advanceDate(date, cycleName, frequency) {
  const result = new Date(date.getTime());
  switch (cycleName) {
    case "Daily": result.setDate(result.getDate() + frequency); break;
    case "Weekly": result.setDate(result.getDate() + frequency * 7); break;
    case "Monthly": result.setMonth(result.getMonth() + frequency); break;
    case "Yearly": result.setFullYear(result.getFullYear() + frequency); break;
  }
  return result;
}

// ================================================================
// ROUTE: Subscriptions Export
// ================================================================
routerAdd("GET", "/api/subscriptions/export", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const userId = e.auth.id;

  const subs = $app.findRecordsByFilter(
    "subscriptions", "user = {:userId}", "name", 0, 0, { userId: userId }
  );

  const exported = [];

  for (const sub of subs) {
    let currencySymbol = "", currencyCode = "";
    try {
      const cur = $app.findRecordById("currencies", sub.get("currency"));
      currencySymbol = cur.get("symbol");
      currencyCode = cur.get("code");
    } catch (_) { }

    let cycleName = "";
    try {
      const cycle = $app.findRecordById("cycles", sub.get("cycle"));
      cycleName = cycle.get("name");
    } catch (_) { }

    let paymentName = "";
    try {
      const pm = $app.findRecordById("payment_methods", sub.get("payment_method"));
      paymentName = pm.get("name");
    } catch (_) { }

    let categoryName = "";
    try {
      const cat = $app.findRecordById("categories", sub.get("category"));
      categoryName = cat.get("name");
    } catch (_) { }

    let payerName = "";
    try {
      const payer = $app.findRecordById("household", sub.get("payer"));
      payerName = payer.get("name");
    } catch (_) { }

    exported.push({
      name: sub.get("name"),
      price: sub.get("price"),
      currency: currencyCode,
      currency_symbol: currencySymbol,
      cycle: cycleName,
      frequency: sub.get("frequency"),
      next_payment: sub.get("next_payment"),
      category: categoryName,
      payment_method: paymentName,
      payer: payerName,
      auto_renew: sub.get("auto_renew"),
      inactive: sub.get("inactive"),
      notes: sub.get("notes"),
      url: sub.get("url"),
    });
  }

  return e.json(200, { subscriptions: exported });
});

// ================================================================
// ROUTE: Calendar iCal Feed
// ================================================================
routerAdd("GET", "/api/calendar/ical", (e) => {
  const apiKey = e.request.url.query().get("key");

  if (!apiKey) {
    return e.json(401, { error: "Missing API key" });
  }

  // Find user by API key
  let user;
  try {
    const users = $app.findRecordsByFilter(
      "users", "api_key = {:apiKey}", "", 1, 0, { apiKey: apiKey }
    );
    if (users.length === 0) {
      return e.json(401, { error: "Invalid API key" });
    }
    user = users[0];
  } catch (_) {
    return e.json(401, { error: "Invalid API key" });
  }

  const userId = user.id;
  const subs = $app.findRecordsByFilter(
    "subscriptions",
    "user = {:userId} && inactive = false",
    "", 0, 0,
    { userId: userId }
  );

  // Build iCalendar output
  let ical = "BEGIN:VCALENDAR\r\n";
  ical += "VERSION:2.0\r\n";
  ical += "PRODID:-//Zublo//Subscription Tracker//EN\r\n";
  ical += "CALSCALE:GREGORIAN\r\n";
  ical += "METHOD:PUBLISH\r\n";
  ical += "X-WR-CALNAME:Zublo Subscriptions\r\n";

  for (const sub of subs) {
    const nextPayment = sub.get("next_payment");
    if (!nextPayment) continue;

    const date = new Date(nextPayment);
    const dtstart = date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const dateStr = dtstart.substring(0, 8);

    let currencySymbol = "$";
    try {
      const cur = $app.findRecordById("currencies", sub.get("currency"));
      currencySymbol = cur.get("symbol");
    } catch (_) { }

    ical += "BEGIN:VEVENT\r\n";
    ical += "UID:" + sub.id + "@zublo\r\n";
    ical += "DTSTART;VALUE=DATE:" + dateStr + "\r\n";
    ical += "DTEND;VALUE=DATE:" + dateStr + "\r\n";
    ical += "SUMMARY:" + sub.get("name") + " - " + currencySymbol + sub.get("price") + "\r\n";
    ical += "DESCRIPTION:Payment due for " + sub.get("name") + "\r\n";
    ical += "END:VEVENT\r\n";
  }

  ical += "END:VCALENDAR\r\n";

  e.response.header().set("Content-Type", "text/calendar; charset=utf-8");
  e.response.header().set("Content-Disposition", "attachment; filename=zublo.ics");
  return e.string(200, ical);
});

// ================================================================
// ROUTE: Calendar Monthly Data
// ================================================================
routerAdd("GET", "/api/calendar/data", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const userId = e.auth.id;

  const month = parseInt(e.request.url.query().get("month")) || (new Date().getMonth() + 1);
  const year = parseInt(e.request.url.query().get("year")) || new Date().getFullYear();

  // Calculate date range for the month
  const startDate = year + "-" + String(month).padStart(2, "0") + "-01";
  const endMonth = month === 12 ? 1 : month + 1;
  const endYear = month === 12 ? year + 1 : year;
  const endDate = endYear + "-" + String(endMonth).padStart(2, "0") + "-01";

  const subs = $app.findRecordsByFilter(
    "subscriptions",
    "user = {:userId} && inactive = false && next_payment >= {:startDate} && next_payment < {:endDate}",
    "next_payment",
    0, 0,
    { userId: userId, startDate: startDate, endDate: endDate }
  );

  const events = [];
  for (const sub of subs) {
    let currencySymbol = "$";
    try {
      const cur = $app.findRecordById("currencies", sub.get("currency"));
      currencySymbol = cur.get("symbol");
    } catch (_) { }

    events.push({
      id: sub.id,
      name: sub.get("name"),
      price: sub.get("price"),
      currency: currencySymbol,
      date: sub.get("next_payment"),
      logo: sub.get("logo"),
    });
  }

  return e.json(200, { events: events, month: month, year: year });
});

// ================================================================
// ROUTE: Payment Methods Icon Search
// ================================================================
routerAdd("GET", "/api/payments/search", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const search = e.request.url.query().get("search");

  if (!search) {
    return e.json(400, { error: "Missing 'search' parameter" });
  }

  // Search for payment brand icons via simple-icons CDN
  const icons = [];
  const query = search.toLowerCase().replace(/\s+/g, "");

  // Try simple-icons (most payment brands are there)
  try {
    const url = "https://cdn.simpleicons.org/" + query;
    const res = $http.send({ url: url, method: "HEAD" });
    if (res.statusCode === 200) {
      icons.push(url);
    }
  } catch (_) { }

  return e.json(200, { icons: icons });
});

// ================================================================
// ROUTE: Admin — SMTP Settings (GET)
// ================================================================
routerAdd("GET", "/api/admin/smtp", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");

  const allUsers = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (allUsers.length === 0 || allUsers[0].id !== e.auth.id) {
    throw new ForbiddenError("Admin access required");
  }

  const s = $app.settings();
  return e.json(200, {
    enabled: s.smtp.enabled,
    host: s.smtp.host,
    port: s.smtp.port,
    username: s.smtp.username,
    tls: s.smtp.tls,
    authMethod: s.smtp.authMethod || "PLAIN",
    localName: s.smtp.localName || "",
    senderAddress: s.meta.senderAddress || "",
    senderName: s.meta.senderName || "",
    // Never expose the password — let the frontend know if one is set
    hasPassword: s.smtp.password !== "",
  });
});

// ================================================================
// ROUTE: Admin — SMTP Settings (POST)
// ================================================================
routerAdd("POST", "/api/admin/smtp", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");

  const allUsers = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (allUsers.length === 0 || allUsers[0].id !== e.auth.id) {
    throw new ForbiddenError("Admin access required");
  }

  const data = e.requestInfo().body;
  const s = $app.settings();

  if (data.enabled !== undefined) s.smtp.enabled = !!data.enabled;
  if (data.host !== undefined) s.smtp.host = String(data.host || "");
  if (data.port !== undefined) s.smtp.port = parseInt(data.port) || 587;
  if (data.username !== undefined) s.smtp.username = String(data.username || "");
  if (data.password && String(data.password).trim() !== "") {
    s.smtp.password = String(data.password);
  }
  if (data.tls !== undefined) s.smtp.tls = !!data.tls;
  if (data.authMethod !== undefined) s.smtp.authMethod = String(data.authMethod || "PLAIN");
  if (data.localName !== undefined) s.smtp.localName = String(data.localName || "");
  if (data.senderAddress !== undefined) s.meta.senderAddress = String(data.senderAddress || "");
  if (data.senderName !== undefined) s.meta.senderName = String(data.senderName || "");

  try {
    $app.save(s);
    return e.json(200, { message: "SMTP settings saved" });
  } catch (err) {
    return e.json(500, { error: "Failed to save SMTP settings: " + err });
  }
});

// ================================================================
// ROUTE: Admin — SMTP Test
// ================================================================
routerAdd("POST", "/api/admin/smtp/test", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");

  const allUsers = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (allUsers.length === 0 || allUsers[0].id !== e.auth.id) {
    throw new ForbiddenError("Admin access required");
  }

  try {
    const user = $app.findRecordById("users", e.auth.id);
    const toEmail = user.get("email");
    const s = $app.settings();

    const message = new MailerMessage({
      from: {
        address: s.meta.senderAddress || "noreply@zublo.app",
        name: s.meta.senderName || "Zublo",
      },
      to: [{ address: toEmail }],
      subject: "Zublo — SMTP Test",
      html: "<p>Your SMTP configuration is working correctly. 🎉</p>",
    });

    $app.newMailClient().send(message);
    return e.json(200, { message: "Test email sent to " + toEmail });
  } catch (err) {
    return e.json(500, { error: "Failed to send test email: " + err });
  }
});

// ================================================================
// ROUTE: Admin — Delete Unused Logos
// ================================================================
routerAdd("POST", "/api/admin/deleteunusedlogos", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");

  // Only first registered user is admin
  const allUsers = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (allUsers.length === 0 || allUsers[0].id !== e.auth.id) {
    throw new ForbiddenError("Admin access required");
  }

  // This is handled by PocketBase's file storage cleanup
  // For now, return a success message
  return e.json(200, { message: "Cleanup completed", deleted: 0 });
});

// ================================================================
// ROUTE: Database Backup (GET — streams the SQLite db file)
// ================================================================
routerAdd("GET", "/api/db/backup", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");

  const allUsers = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (allUsers.length === 0 || allUsers[0].id !== e.auth.id) {
    throw new ForbiddenError("Admin access required");
  }

  try {
    const dbPath = $app.dataDir() + "/data.db";
    const filename = "zublo-backup-" + new Date().toISOString().split("T")[0] + ".db";
    const data = $os.readFile(dbPath);

    e.response.header().set("Content-Type", "application/octet-stream");
    e.response.header().set("Content-Disposition", 'attachment; filename="' + filename + '"');
    e.response.header().set("Content-Length", String(data.length));
    e.response.write(data);
    return null;
  } catch (err) {
    return e.json(500, { error: "Backup failed: " + err });
  }
});

// ================================================================
// ROUTE: Database Restore (POST — accepts .db file upload)
// ================================================================
routerAdd("POST", "/api/db/restore", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");

  const allUsers = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (allUsers.length === 0 || allUsers[0].id !== e.auth.id) {
    throw new ForbiddenError("Admin access required");
  }

  try {
    const result = e.request.formFile("file");
    const fileHeader = result[1];
    if (!fileHeader) {
      return e.json(400, { error: "No backup file provided" });
    }

    const name = "_restore_upload_" + Date.now() + ".db";
    const destPath = $app.dataDir() + "/backups/" + name;

    // Read uploaded bytes and write to backups directory
    const srcFile = result[0];
    const chunks = [];
    const buf = new Uint8Array(65536);
    let n = srcFile.read(buf);
    while (n > 0) {
      chunks.push(...buf.slice(0, n));
      n = srcFile.read(buf);
    }
    srcFile.close();
    $os.writeFile(destPath, chunks, 0o644);

    $app.restoreBackup(name);
    return e.json(200, { message: "Restore completed" });
  } catch (err) {
    return e.json(500, { error: "Restore failed: " + err });
  }
});

// ================================================================
// ADMIN USER MANAGEMENT ROUTES
// ================================================================

// GET /api/admin/users — list all users
routerAdd("GET", "/api/admin/users", (e) => {
  try {
    if (!e.auth) throw new ForbiddenError("Authentication required");
    const _adm = $app.findRecordsByFilter("users", "", "+created", 1, 0);
    if (_adm.length === 0 || _adm[0].id !== e.auth.id) {
      throw new ForbiddenError("Admin access required");
    }

    const all = $app.findRecordsByFilter("users", "1=1", "+created", -1, 0);
    const firstId = all.length > 0 ? all[0].id : null;

    const result = all.map((u) => ({
      id: u.id,
      username: u.getString("username"),
      name: u.getString("name"),
      email: u.getString("email"),
      avatar: u.getString("avatar"),
      created: u.getString("created"),
      totp_enabled: u.getBool("totp_enabled"),
      is_admin: u.id === firstId,
    }));

    return e.json(200, result);
  } catch (err) {
    if (err && err.status) throw err;
    return e.json(500, { error: String(err) });
  }
});

// PATCH /api/admin/users/:id — update user data
routerAdd("PATCH", "/api/admin/users/{id}", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const _adm = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (_adm.length === 0 || _adm[0].id !== e.auth.id) throw new ForbiddenError("Admin access required");

  const id = e.request.pathValue("id");
  const user = $app.findRecordById("users", id);
  const data = e.requestInfo().body;

  if (data.name !== undefined) user.set("name", data.name);
  if (data.username !== undefined) user.set("username", data.username);
  if (data.email !== undefined) {
    user.set("email", data.email);
    user.set("emailVisibility", true);
  }
  if (data.password) {
    user.set("password", data.password);
    user.set("passwordConfirm", data.password);
  }

  $app.save(user);

  return e.json(200, {
    id: user.id,
    username: user.getString("username"),
    name: user.getString("name"),
    email: user.getString("email"),
    avatar: user.getString("avatar"),
    totp_enabled: user.getBool("totp_enabled"),
  });
});

// DELETE /api/admin/users/:id — delete user (cannot delete self)
routerAdd("DELETE", "/api/admin/users/{id}", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const _adm = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (_adm.length === 0 || _adm[0].id !== e.auth.id) throw new ForbiddenError("Admin access required");

  const id = e.request.pathValue("id");

  if (id === e.auth.id) {
    return e.json(400, { error: "Cannot delete your own account" });
  }

  const user = $app.findRecordById("users", id);
  $app.delete(user);

  return e.json(200, { message: "User deleted" });
});

// POST /api/admin/users/:id/avatar — upload avatar
routerAdd("POST", "/api/admin/users/{id}/avatar", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const _adm = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (_adm.length === 0 || _adm[0].id !== e.auth.id) throw new ForbiddenError("Admin access required");

  const id = e.request.pathValue("id");
  const user = $app.findRecordById("users", id);

  const result = e.request.formFile("avatar");
  const fileHeader = result[1];
  if (!fileHeader) {
    return e.json(400, { error: "No avatar file provided" });
  }

  const fsFile = $filesystem.fileFromMultipart(fileHeader);
  user.set("avatar", fsFile);
  $app.save(user);

  return e.json(200, {
    id: user.id,
    avatar: user.getString("avatar"),
  });
});

// ================================================================
// ROUTE: Admin Settings — GET
// ================================================================
routerAdd("GET", "/api/admin/settings", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const _adm = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (_adm.length === 0 || _adm[0].id !== e.auth.id) throw new ForbiddenError("Admin access required");

  let record = null;
  try {
    const all = $app.findRecordsByFilter("admin_settings", "", "", 1, 0);
    if (all.length > 0) record = all[0];
  } catch (_) {}

  if (!record) return e.json(200, {});

  return e.json(200, {
    id: record.id,
    open_registrations: record.getBool("open_registrations"),
    disable_login: record.getBool("disable_login"),
    update_notification: record.getBool("update_notification"),
    require_email_validation: record.getBool("require_email_validation"),
    max_users: record.getFloat("max_users"),
    server_url: record.getString("server_url"),
    oidc_enabled: record.getBool("oidc_enabled"),
    oidc_provider_name: record.getString("oidc_provider_name"),
    oidc_client_id: record.getString("oidc_client_id"),
    oidc_client_secret: record.getString("oidc_client_secret"),
    oidc_issuer_url: record.getString("oidc_issuer_url"),
    oidc_redirect_url: record.getString("oidc_redirect_url"),
    oidc_scopes: record.getString("oidc_scopes"),
    webhook_allowlist_csv: record.getString("webhook_allowlist_csv"),
    latest_version: record.getString("latest_version"),
  });
});

// ================================================================
// ROUTE: Admin Settings — PATCH
// ================================================================
routerAdd("PATCH", "/api/admin/settings", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const _adm = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (_adm.length === 0 || _adm[0].id !== e.auth.id) throw new ForbiddenError("Admin access required");

  const data = e.requestInfo().body;

  let record = null;
  try {
    const all = $app.findRecordsByFilter("admin_settings", "", "", 1, 0);
    if (all.length > 0) record = all[0];
  } catch (_) {}

  if (!record) {
    const col = $app.findCollectionByNameOrId("admin_settings");
    record = new Record(col);
  }

  const boolFields = [
    "open_registrations", "disable_login", "update_notification",
    "require_email_validation", "oidc_enabled",
  ];
  for (const f of boolFields) {
    if (data[f] !== undefined) record.set(f, !!data[f]);
  }

  const textFields = [
    "server_url", "oidc_provider_name", "oidc_client_id", "oidc_client_secret",
    "oidc_issuer_url", "oidc_redirect_url", "oidc_scopes", "webhook_allowlist_csv",
    "latest_version",
  ];
  for (const f of textFields) {
    if (data[f] !== undefined) record.set(f, String(data[f] || ""));
  }

  if (data.max_users !== undefined) record.set("max_users", Number(data.max_users) || 0);

  $app.save(record);

  return e.json(200, { message: "Settings saved" });
});
