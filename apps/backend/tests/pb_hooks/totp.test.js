const { createHash, createHmac } = require("node:crypto");

const {
  _sha1,
  _hmacSha1,
  _base32Decode,
  generateTOTPAt,
  verifyTOTPAt,
  verifyTOTP,
  normalizeBackupCode,
  findBackupCodeIndex,
  generateBackupCodes,
} = require("../../pb_hooks/lib/totp.js");

const RFC6238_SECRET_BASE32 = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

function toHex(bytes) {
  return Buffer.from(bytes).toString("hex");
}

function sha1WithNode(bytes) {
  return createHash("sha1").update(Buffer.from(bytes)).digest("hex");
}

function hmacSha1WithNode(keyBytes, msgBytes) {
  return createHmac("sha1", Buffer.from(keyBytes))
    .update(Buffer.from(msgBytes))
    .digest("hex");
}

function counterToBytes(counter) {
  return [
    0,
    0,
    0,
    0,
    (counter >>> 24) & 0xff,
    (counter >>> 16) & 0xff,
    (counter >>> 8) & 0xff,
    counter & 0xff,
  ];
}

function generateTotpWithNode(secretBase32, timestampMs) {
  const key = Buffer.from(_base32Decode(secretBase32));
  const counter = Math.floor(timestampMs / 1000 / 30);
  const msg = Buffer.from(counterToBytes(counter));
  const hash = createHmac("sha1", key).update(msg).digest();
  const offset = hash[19] & 0x0f;
  const binary =
    (((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff)) >>>
    0;

  return {
    counter,
    offset,
    otp: String(binary % 1_000_000).padStart(6, "0"),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("pb_hooks/lib/totp.js::_sha1", () => {
  const boundaryLengths = [0, 1, 2, 3, 54, 55, 56, 57, 63, 64, 65, 127, 128];

  for (const length of boundaryLengths) {
    it(`matches Node SHA-1 at the ${length}-byte padding boundary`, () => {
      const input = Array.from({ length }, (_, index) => (index * 37 + 0x80) & 0xff);
      expect(toHex(_sha1(input))).toBe(sha1WithNode(input));
    });
  }

  it("matches the canonical 'abc' vector", () => {
    const bytes = Array.from(Buffer.from("abc", "utf8"));
    expect(toHex(_sha1(bytes))).toBe("a9993e364706816aba3e25717850c26c9cd0d89d");
  });

  it("handles signed-byte inputs without bit-shift corruption", () => {
    const bytes = [0xff, 0x80, 0xfe, 0x7f, 0xaa, 0x55, 0x00, 0x99];
    expect(toHex(_sha1(bytes))).toBe(sha1WithNode(bytes));
  });
});

describe("pb_hooks/lib/totp.js::_hmacSha1", () => {
  it("matches Node HMAC-SHA1 for the standard RFC-style sample", () => {
    const key = Array.from(Buffer.from("key", "utf8"));
    const msg = Array.from(Buffer.from("The quick brown fox jumps over the lazy dog", "utf8"));
    expect(toHex(_hmacSha1(key, msg))).toBe(hmacSha1WithNode(key, msg));
  });

  it("matches Node HMAC-SHA1 with an empty key and empty message", () => {
    expect(toHex(_hmacSha1([], []))).toBe(hmacSha1WithNode([], []));
  });

  it("matches Node HMAC-SHA1 when the key is exactly one block", () => {
    const key = Array.from({ length: 64 }, (_, index) => (index + 1) & 0xff);
    const msg = Array.from({ length: 19 }, (_, index) => (index * 11) & 0xff);
    expect(toHex(_hmacSha1(key, msg))).toBe(hmacSha1WithNode(key, msg));
  });

  it("matches Node HMAC-SHA1 when the key exceeds one block and must be pre-hashed", () => {
    const key = Array.from({ length: 65 }, (_, index) => (255 - index) & 0xff);
    const msg = Array.from({ length: 80 }, (_, index) => (index * 29 + 7) & 0xff);
    expect(toHex(_hmacSha1(key, msg))).toBe(hmacSha1WithNode(key, msg));
  });

  it("matches Node HMAC-SHA1 with high-bit data to exercise xor and rotation paths", () => {
    const key = [0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa, 0x99, 0x88];
    const msg = [0x80, 0x81, 0xfe, 0xff, 0x01, 0x02, 0x03, 0x04];
    expect(toHex(_hmacSha1(key, msg))).toBe(hmacSha1WithNode(key, msg));
  });
});

describe("pb_hooks/lib/totp.js::_base32Decode", () => {
  it("decodes a canonical uppercase base32 secret", () => {
    expect(Buffer.from(_base32Decode(RFC6238_SECRET_BASE32)).toString("ascii")).toBe(
      "12345678901234567890",
    );
  });

  it("ignores lowercase, whitespace, and padding characters", () => {
    expect(
      Buffer.from(_base32Decode("  gezdgnbv gy3tqojq=\nGEZDGNBVGY3TQOJQ  ")).toString("ascii"),
    ).toBe("12345678901234567890");
  });

  it("ignores non-base32 garbage characters instead of throwing", () => {
    expect(Buffer.from(_base32Decode("M!Y@======")).toString("ascii")).toBe("f");
  });

  it("flushes partial trailing bytes correctly", () => {
    expect(Buffer.from(_base32Decode("MY")).toString("ascii")).toBe("f");
    expect(Buffer.from(_base32Decode("MZXQ")).toString("ascii")).toBe("fo");
  });
});

describe("pb_hooks/lib/totp.js::verifyTOTP", () => {
  it("accepts the exact current 30-second window", () => {
    const now = 59_000;
    const { otp } = generateTotpWithNode(RFC6238_SECRET_BASE32, now);
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(verifyTOTP(RFC6238_SECRET_BASE32, otp)).toBe(true);
  });

  it("accepts the previous window for clock skew", () => {
    const now = 120_000;
    const { otp } = generateTotpWithNode(RFC6238_SECRET_BASE32, now - 30_000);
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(verifyTOTP(RFC6238_SECRET_BASE32, otp)).toBe(true);
  });

  it("accepts the next window for clock skew", () => {
    const now = 120_000;
    const { otp } = generateTotpWithNode(RFC6238_SECRET_BASE32, now + 30_000);
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(verifyTOTP(RFC6238_SECRET_BASE32, otp)).toBe(true);
  });

  it("rejects codes outside the +/-1 window", () => {
    const now = 120_000;
    const tooOld = generateTotpWithNode(RFC6238_SECRET_BASE32, now - 60_000).otp;
    const tooNew = generateTotpWithNode(RFC6238_SECRET_BASE32, now + 60_000).otp;
    vi.spyOn(Date, "now").mockReturnValue(now);
    expect(verifyTOTP(RFC6238_SECRET_BASE32, tooOld)).toBe(false);
    expect(verifyTOTP(RFC6238_SECRET_BASE32, tooNew)).toBe(false);
  });

  it("trims the incoming code and preserves leading-zero OTPs", () => {
    let sample = null;

    for (let step = 0; step < 20_000; step++) {
      const timestampMs = step * 30_000;
      const { otp } = generateTotpWithNode(RFC6238_SECRET_BASE32, timestampMs);
      if (otp.startsWith("0")) {
        sample = { timestampMs, otp };
        break;
      }
    }

    expect(sample).not.toBeNull();
    vi.spyOn(Date, "now").mockReturnValue(sample.timestampMs);
    expect(sample.otp).toMatch(/^0\d{5}$/);
    expect(verifyTOTP(RFC6238_SECRET_BASE32, `  ${sample.otp}  `)).toBe(true);
  });

  it("covers every dynamic truncation offset from 0 to 15", () => {
    const seenOffsets = new Map();

    for (let step = 0; step < 50_000 && seenOffsets.size < 16; step++) {
      const timestampMs = step * 30_000;
      const sample = generateTotpWithNode(RFC6238_SECRET_BASE32, timestampMs);
      if (!seenOffsets.has(sample.offset)) {
        seenOffsets.set(sample.offset, { timestampMs, otp: sample.otp });
      }
    }

    expect([...seenOffsets.keys()].sort((a, b) => a - b)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
    ]);

    for (const { timestampMs, otp } of seenOffsets.values()) {
      vi.spyOn(Date, "now").mockReturnValue(timestampMs);
      expect(verifyTOTP(RFC6238_SECRET_BASE32, otp)).toBe(true);
      vi.restoreAllMocks();
    }
  });
});

describe("pb_hooks/lib/totp.js::direct helpers", () => {
  it("supports direct TOTP generation and verification with custom digits and step sizes", () => {
    const timestampMs = 120_000;
    const code = generateTOTPAt(RFC6238_SECRET_BASE32, timestampMs, 8, 60);

    expect(code).toMatch(/^\d{8}$/);
    expect(verifyTOTPAt(RFC6238_SECRET_BASE32, code, timestampMs, 0, 8, 60)).toBe(true);
    expect(verifyTOTPAt(RFC6238_SECRET_BASE32, code, timestampMs + 60_000, 0, 8, 60)).toBe(false);
  });

  it("normalizes backup codes and finds a matching saved code index", () => {
    expect(normalizeBackupCode(" abcd-1234 \n")).toBe("ABCD1234");
    expect(findBackupCodeIndex(["WXYZ-9876", "ABCD-1234"], "abcd 1234")).toBe(1);
    expect(findBackupCodeIndex(["WXYZ-9876"], "   ")).toBe(-1);
    expect(findBackupCodeIndex(["WXYZ-9876"], "miss-0000")).toBe(-1);
  });

  it("generates backup codes through an injected generator", () => {
    const calls = [];
    const codes = generateBackupCodes((length, alphabet) => {
      calls.push({ length, alphabet });
      return "ABCD";
    });

    expect(codes).toHaveLength(8);
    expect(codes.every((code) => code === "ABCD-ABCD")).toBe(true);
    expect(calls).toHaveLength(16);
    expect(calls[0]).toEqual({
      length: 4,
      alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
    });
  });

  it("falls back to PocketBase security globals when no generator is injected", () => {
    const originalSecurity = global.$security;
    const generated = [];
    global.$security = {
      randomStringWithAlphabet(length, alphabet) {
        generated.push({ length, alphabet });
        return "WXYZ";
      },
    };

    try {
      const codes = generateBackupCodes();
      expect(codes).toHaveLength(8);
      expect(codes[0]).toBe("WXYZ-WXYZ");
      expect(generated).toHaveLength(16);
    } finally {
      global.$security = originalSecurity;
    }
  });
});
