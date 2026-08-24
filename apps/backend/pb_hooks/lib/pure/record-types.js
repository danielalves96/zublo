var ONE_TIME_CYCLE = "One-Time";

function normalizeRecordType(value) {
  return value === "credit" ? "credit" : "expense";
}

function isCredit(value) {
  return normalizeRecordType(value) === "credit";
}

function isExpense(value) {
  return !isCredit(value);
}

function isOneTimeCycle(cycleName) {
  return String(cycleName || "") === ONE_TIME_CYCLE;
}

/**
 * A credit and the One-Time cycle describe the same thing: a single dated
 * payout.  Letting the two drift apart corrupts the money math in both
 * directions, which is why the pairing is enforced on every write path:
 *
 * - a One-Time *expense* falls through the `default` branch of every
 *   cycle-to-monthly formula, which treats it as a monthly charge, so a
 *   one-off purchase inflates the monthly total forever;
 * - a *recurring* credit is skipped by the updateNextPayment cron, so its
 *   next_payment never advances and the credit silently stops counting once
 *   its month has passed.
 *
 * Credits are repaired by forcing them onto the One-Time cycle.  A One-Time
 * expense has no safe repair (we cannot guess the intended cycle), so it is
 * rejected and reported here.
 *
 * Returns an error message, or "" when the pairing is valid.
 */
function validateRecordTypeCycle(recordType, cycleName) {
  if (isExpense(recordType) && isOneTimeCycle(cycleName)) {
    return "The One-Time cycle is reserved for credits";
  }
  return "";
}

module.exports = {
  isCredit,
  isExpense,
  isOneTimeCycle,
  normalizeRecordType,
  ONE_TIME_CYCLE,
  validateRecordTypeCycle,
};
