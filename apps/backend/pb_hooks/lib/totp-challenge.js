/**
 * Short-lived TOTP login challenges.
 *
 * After a password authenticates but before a session is issued, the server
 * stores only a hash of a random challenge plus its expiry on the user
 * record. The plaintext challenge goes to the client and comes back on the
 * verify call, so a leaked database row cannot be replayed into a session.
 *
 * These helpers live in a required module rather than at the top of
 * routes_auth.pb.js because PocketBase runs each router callback on a pooled
 * Goja runtime that never evaluated that file's top level.
 */

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

module.exports = {
  TOTP_LOGIN_CHALLENGE_TTL_MS,
  hashTotpLoginChallenge,
  clearTotpLoginChallenge,
  createTotpLoginChallenge,
  findUserByTotpLoginChallenge,
};
