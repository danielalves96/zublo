/**
 * Decides whether a new account may be created on this instance.
 *
 * Two admin settings govern it: `open_registrations` and `max_users`.
 * Neither is readable from the public login page, so the same decision has
 * to be made server-side on every signup as well as reported to the login
 * page through a public endpoint. Keeping the rules here means both callers
 * answer identically.
 *
 * The very first account is always allowed regardless of the settings —
 * otherwise a fresh instance whose defaults happen to be off could never be
 * bootstrapped, locking the owner out of their own deployment.
 */

const REGISTRATIONS_CLOSED = "Registrations are closed on this instance";
const USER_LIMIT_REACHED = "This instance has reached its user limit";

function toCount(value) {
  const count = Number(value);
  return isFinite(count) && count > 0 ? count : 0;
}

function isBootstrap(userCount) {
  return toCount(userCount) === 0;
}

/** Null when a signup may proceed, otherwise the reason it may not. */
function registrationRejection(policy, userCount) {
  if (isBootstrap(userCount)) return null;
  if (!policy || !policy.openRegistrations) return REGISTRATIONS_CLOSED;

  const max = Number(policy.maxUsers);
  if (!isFinite(max) || max <= 0) return null;

  return toCount(userCount) < max ? null : USER_LIMIT_REACHED;
}

function isRegistrationOpen(policy, userCount) {
  return registrationRejection(policy, userCount) === null;
}

module.exports = {
  REGISTRATIONS_CLOSED,
  USER_LIMIT_REACHED,
  isBootstrap,
  isRegistrationOpen,
  registrationRejection,
};
