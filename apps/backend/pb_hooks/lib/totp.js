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

module.exports = {
  verifyTOTP,
  generateBackupCodes,
  _sha1,
  _hmacSha1,
  _base32Decode
};
