function _sha1(bytes) {
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;

  const padded = bytes.slice();
  padded.push(0x80);
  while (padded.length % 64 !== 56) padded.push(0);

  const bitLen = bytes.length * 8;
  padded.push(0, 0, 0, 0);
  padded.push((bitLen >>> 24) & 0xff, (bitLen >>> 16) & 0xff, (bitLen >>> 8) & 0xff, bitLen & 0xff);

  for (let i = 0; i < padded.length; i += 64) {
    const w = new Array(80);
    for (let j = 0; j < 16; j++) {
      const b = i + j * 4;
      w[j] = ((padded[b] << 24) | (padded[b + 1] << 16) | (padded[b + 2] << 8) | padded[b + 3]) | 0;
    }
    for (let j = 16; j < 80; j++) {
      const n = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w[j] = ((n << 1) | (n >>> 31)) | 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let j = 0; j < 80; j++) {
      let f;
      let k;
      if (j < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (j < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (j < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }

      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) | 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) | 0;
      b = a;
      a = temp;
    }

    h0 = (h0 + a) | 0;
    h1 = (h1 + b) | 0;
    h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0;
    h4 = (h4 + e) | 0;
  }

  return [
    (h0 >>> 24) & 0xff, (h0 >>> 16) & 0xff, (h0 >>> 8) & 0xff, h0 & 0xff,
    (h1 >>> 24) & 0xff, (h1 >>> 16) & 0xff, (h1 >>> 8) & 0xff, h1 & 0xff,
    (h2 >>> 24) & 0xff, (h2 >>> 16) & 0xff, (h2 >>> 8) & 0xff, h2 & 0xff,
    (h3 >>> 24) & 0xff, (h3 >>> 16) & 0xff, (h3 >>> 8) & 0xff, h3 & 0xff,
    (h4 >>> 24) & 0xff, (h4 >>> 16) & 0xff, (h4 >>> 8) & 0xff, h4 & 0xff,
  ];
}

function _hmacSha1(keyBytes, msgBytes) {
  const blockSize = 64;
  const key = keyBytes.slice();
  let effectiveKey = key;
  if (effectiveKey.length > blockSize) effectiveKey = _sha1(effectiveKey);
  while (effectiveKey.length < blockSize) effectiveKey.push(0);
  const ipad = effectiveKey.map(function (value) { return value ^ 0x36; });
  const opad = effectiveKey.map(function (value) { return value ^ 0x5c; });
  return _sha1(opad.concat(_sha1(ipad.concat(msgBytes))));
}

function _base32Decode(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const normalized = String(value || "").toUpperCase().replace(/[=\s]/g, "");
  const output = [];
  let buffer = 0;
  let bits = 0;

  for (let index = 0; index < normalized.length; index++) {
    const charIndex = alphabet.indexOf(normalized[index]);
    if (charIndex === -1) continue;
    buffer = (buffer << 5) | charIndex;
    bits += 5;
    if (bits >= 8) {
      output.push((buffer >> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }

  return output;
}

function counterToBytes(counter) {
  return [
    0, 0, 0, 0,
    (counter >>> 24) & 0xff,
    (counter >>> 16) & 0xff,
    (counter >>> 8) & 0xff,
    counter & 0xff,
  ];
}

function truncateHmacToOtp(hashBytes, digits) {
  const size = digits || 6;
  const offset = hashBytes[19] & 0x0f;
  const binary = (((hashBytes[offset] & 0x7f) << 24) |
    ((hashBytes[offset + 1] & 0xff) << 16) |
    ((hashBytes[offset + 2] & 0xff) << 8) |
    (hashBytes[offset + 3] & 0xff)) >>> 0;
  const modulus = Math.pow(10, size);
  return String(binary % modulus).padStart(size, "0");
}

function generateTOTPAt(secret, timestampMs, digits, stepSeconds) {
  const step = stepSeconds || 30;
  const key = _base32Decode(secret);
  const counter = Math.floor(timestampMs / 1000 / step);
  const hash = _hmacSha1(key, counterToBytes(counter));
  return truncateHmacToOtp(hash, digits || 6);
}

function verifyTOTPAt(secret, code, timestampMs, window, digits, stepSeconds) {
  const driftWindow = window === undefined ? 1 : window;
  const step = stepSeconds || 30;
  const normalizedCode = String(code).trim();
  const baseCounter = Math.floor(timestampMs / 1000 / step);

  for (let offset = -driftWindow; offset <= driftWindow; offset++) {
    const counter = baseCounter + offset;
    const hash = _hmacSha1(_base32Decode(secret), counterToBytes(counter));
    if (truncateHmacToOtp(hash, digits || 6) === normalizedCode) return true;
  }
  return false;
}

function verifyTOTP(secret, code, options) {
  const settings = options || {};
  return verifyTOTPAt(
    secret,
    code,
    settings.nowMs === undefined ? Date.now() : settings.nowMs,
    settings.window,
    settings.digits,
    settings.stepSeconds,
  );
}

function normalizeBackupCode(value) {
  return String(value || "").replace(/[\s-]/g, "").toUpperCase();
}

function findBackupCodeIndex(savedCodes, providedCode) {
  const normalizedProvided = normalizeBackupCode(providedCode);
  if (!normalizedProvided) return -1;
  for (let index = 0; index < savedCodes.length; index++) {
    if (normalizeBackupCode(savedCodes[index]) === normalizedProvided) return index;
  }
  return -1;
}

module.exports = {
  _sha1,
  _hmacSha1,
  _base32Decode,
  counterToBytes,
  truncateHmacToOtp,
  generateTOTPAt,
  verifyTOTPAt,
  verifyTOTP,
  normalizeBackupCode,
  findBackupCodeIndex,
};
