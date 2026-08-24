/**
 * Advances a date by the given cycle and frequency.
 *
 * All arithmetic is done in UTC because that is how PocketBase stores these
 * dates. Reading them with local accessors shifted the calendar day for
 * anyone west of Greenwich: 2026-01-01T00:00Z is 2025-12-31 locally in
 * UTC-3, so advancing two quarters landed on the 31st of a 30-day month and
 * rolled into 2026-07-02 instead of 2026-07-01. It only misbehaved outside
 * UTC, which is why CI never caught it.
 *
 * @param {Date} date
 * @param {string} cycleName - "Daily" | "Weekly" | "Monthly" | "Quarterly" | "Half-Yearly" | "Yearly"
 * @param {number} frequency - multiplier
 * @returns {Date}
 */
function advanceDate(date, cycleName, frequency) {
  const result = new Date(date.getTime());

  switch (cycleName) {
    case "Daily":
      result.setUTCDate(result.getUTCDate() + frequency);
      break;
    case "Weekly":
      result.setUTCDate(result.getUTCDate() + frequency * 7);
      break;
    case "Monthly":
      result.setUTCMonth(result.getUTCMonth() + frequency);
      break;
    case "Quarterly":
      // 1 quarter = 3 months
      result.setUTCMonth(result.getUTCMonth() + frequency * 3);
      break;
    case "Half-Yearly":
      // 1 half-year = 6 months
      result.setUTCMonth(result.getUTCMonth() + frequency * 6);
      break;
    case "Yearly":
      result.setUTCFullYear(result.getUTCFullYear() + frequency);
      break;
  }

  return result;
}

/**
 * Formats a Date as YYYY-MM-DD from its local calendar day.
 *
 * The cron jobs build "today" out of local components and compare it against
 * next_payment and sent_date, which are plain calendar dates. Serialising
 * those with toISOString() re-reads them in UTC, which lands on the wrong day
 * on any server that is not on UTC: east of Greenwich local midnight is still
 * yesterday in UTC, and west of it the evening has already rolled into
 * tomorrow. Either way reminders fire a day out, or silently not at all.
 *
 * @param {Date} date
 * @returns {string}
 */
function formatLocalDate(date) {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  return date.getFullYear()
    + "-" + (month < 10 ? "0" + month : month)
    + "-" + (day < 10 ? "0" + day : day);
}

/**
 * Calculates the monthly cost of a subscription.
 * @param {number} price
 * @param {string} cycleName
 * @param {number} frequency
 * @param {number} exchangeRate
 * @returns {number}
 */
function getPricePerMonth(price, cycleName, frequency, exchangeRate) {
  const converted = price / (exchangeRate || 1);

  switch (cycleName) {
    case "Daily":
      return converted * frequency * 30;
    case "Weekly":
      return (converted / frequency) * 4.33;
    case "Monthly":
      return converted / frequency;
    case "Quarterly":
      // Price is charged every (frequency * 3) months
      return converted / (frequency * 3);
    case "Half-Yearly":
      // Price is charged every (frequency * 6) months
      return converted / (frequency * 6);
    case "Yearly":
      return converted / (frequency * 12);
    case "One-Time":
      // A single dated payout has no recurring monthly equivalent. Without
      // this case it would fall through to `converted` and be billed as a
      // monthly charge forever.
      return 0;
    default:
      return converted;
  }
}

module.exports = {
  advanceDate,
  formatLocalDate,
  getPricePerMonth
};
