/**
 * Advances a date by the given cycle and frequency.
 * @param {Date} date
 * @param {string} cycleName - "Daily" | "Weekly" | "Monthly" | "Yearly"
 * @param {number} frequency - multiplier
 * @returns {Date}
 */
function advanceDate(date, cycleName, frequency) {
  const result = new Date(date.getTime());

  switch (cycleName) {
    case "Daily":
      result.setDate(result.getDate() + frequency);
      break;
    case "Weekly":
      result.setDate(result.getDate() + frequency * 7);
      break;
    case "Monthly":
      result.setMonth(result.getMonth() + frequency);
      break;
    case "Yearly":
      result.setFullYear(result.getFullYear() + frequency);
      break;
  }

  return result;
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
    case "Yearly":
      return converted / (frequency * 12);
    default:
      return converted;
  }
}

module.exports = {
  advanceDate,
  getPricePerMonth
};
