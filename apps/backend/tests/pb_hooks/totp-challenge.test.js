const challenges = require("../../pb_hooks/lib/totp-challenge.js");

function userRecord(fields = {}) {
  const values = { ...fields };
  return {
    values,
    get: (key) => values[key],
    set: (key, value) => { values[key] = value; },
  };
}

let saved;

beforeEach(() => {
  saved = [];
  globalThis.$security = {
    sha256: (value) => "sha256:" + value,
    randomString: (length) => "r".repeat(length),
  };
  globalThis.$app = {
    findRecordsByFilter: vi.fn(() => []),
    save: (record) => { saved.push(record); },
  };
});

afterEach(() => {
  Reflect.deleteProperty(globalThis, "$security");
  Reflect.deleteProperty(globalThis, "$app");
});

describe("pb_hooks/lib/totp-challenge.js", () => {
  it("hashes a challenge and treats missing input as an empty string", () => {
    expect(challenges.hashTotpLoginChallenge("abc")).toBe("sha256:abc");
    expect(challenges.hashTotpLoginChallenge(null)).toBe("sha256:");
    expect(challenges.hashTotpLoginChallenge(undefined)).toBe("sha256:");
  });

  it("clears both challenge fields without saving", () => {
    const user = userRecord({
      totp_login_challenge_hash: "sha256:old",
      totp_login_challenge_expires: "2026-01-01T00:00:00.000Z",
    });

    challenges.clearTotpLoginChallenge(user);

    expect(user.values.totp_login_challenge_hash).toBe("");
    expect(user.values.totp_login_challenge_expires).toBe("");
    expect(saved).toEqual([]);
  });

  it("stores only the hash and hands the plaintext challenge back", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-01T12:00:00.000Z"));

    const user = userRecord();
    const issued = challenges.createTotpLoginChallenge(user);

    expect(issued.challenge).toHaveLength(64);
    expect(issued.expiresAt).toBe("2026-03-01T12:05:00.000Z");
    expect(user.values.totp_login_challenge_hash).toBe("sha256:" + issued.challenge);
    expect(saved).toEqual([user]);

    vi.useRealTimers();
  });

  it("expires challenges after the documented five minutes", () => {
    expect(challenges.TOTP_LOGIN_CHALLENGE_TTL_MS).toBe(5 * 60 * 1000);
  });

  it("looks a user up by the hash rather than the plaintext challenge", () => {
    const user = userRecord({
      totp_login_challenge_expires: new Date(Date.now() + 60_000).toISOString(),
    });
    globalThis.$app.findRecordsByFilter = vi.fn(() => [user]);

    expect(challenges.findUserByTotpLoginChallenge("  secret  ")).toBe(user);

    const params = globalThis.$app.findRecordsByFilter.mock.calls[0][5];
    expect(params).toEqual({ hash: "sha256:secret" });
  });

  it("rejects an empty challenge without querying", () => {
    expect(challenges.findUserByTotpLoginChallenge("")).toBeNull();
    expect(challenges.findUserByTotpLoginChallenge("   ")).toBeNull();
    expect(challenges.findUserByTotpLoginChallenge(null)).toBeNull();
    expect(globalThis.$app.findRecordsByFilter).not.toHaveBeenCalled();
  });

  it("rejects a challenge no user holds", () => {
    globalThis.$app.findRecordsByFilter = vi.fn(() => []);
    expect(challenges.findUserByTotpLoginChallenge("nope")).toBeNull();

    globalThis.$app.findRecordsByFilter = vi.fn(() => null);
    expect(challenges.findUserByTotpLoginChallenge("nope")).toBeNull();
  });

  it("burns an expired challenge instead of returning the user", () => {
    const user = userRecord({
      totp_login_challenge_hash: "sha256:stale",
      totp_login_challenge_expires: new Date(Date.now() - 1000).toISOString(),
    });
    globalThis.$app.findRecordsByFilter = vi.fn(() => [user]);

    expect(challenges.findUserByTotpLoginChallenge("stale")).toBeNull();
    expect(user.values.totp_login_challenge_hash).toBe("");
    expect(saved).toEqual([user]);
  });

  it("burns a challenge whose expiry was never stored", () => {
    const user = userRecord({ totp_login_challenge_hash: "sha256:orphan" });
    globalThis.$app.findRecordsByFilter = vi.fn(() => [user]);

    expect(challenges.findUserByTotpLoginChallenge("orphan")).toBeNull();
    expect(saved).toEqual([user]);
  });
});
