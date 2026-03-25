function detectWallosFormat(subscription) {
  return Object.prototype.hasOwnProperty.call(subscription || {}, "Name") ||
    Object.prototype.hasOwnProperty.call(subscription || {}, "Payment Cycle");
}

function parseCycleAndFrequency(paymentCycle) {
  if (!paymentCycle) return { cycleName: "Monthly", frequency: 1 };
  var normalized = String(paymentCycle).toLowerCase().trim();
  var direct = {
    daily: "Daily",
    weekly: "Weekly",
    monthly: "Monthly",
    yearly: "Yearly",
  };
  if (direct[normalized]) return { cycleName: direct[normalized], frequency: 1 };

  var match = String(paymentCycle).match(/every\s+(\d+)\s+(days?|weeks?|months?|years?)/i);
  if (!match) return { cycleName: "Monthly", frequency: 1 };

  var unitMap = {
    day: "Daily",
    days: "Daily",
    week: "Weekly",
    weeks: "Weekly",
    month: "Monthly",
    months: "Monthly",
    year: "Yearly",
    years: "Yearly",
  };

  return {
    /* v8 ignore next -- regex only captures day/week/month/year variants, all present in unitMap */
    cycleName: unitMap[match[2].toLowerCase()] || "Monthly",
    frequency: parseInt(match[1], 10),
  };
}

function parseWallosPrice(priceValue) {
  var raw = String(priceValue || "0");
  var match = raw.match(/^([^\d]*)(\d[\d.,]*)$/);
  if (!match) {
    return { symbol: "", price: parseFloat(raw) || 0 };
  }
  return {
    symbol: match[1].trim(),
    price: parseFloat(match[2].replace(",", ".")) || 0,
  };
}

module.exports = {
  detectWallosFormat,
  parseCycleAndFrequency,
  parseWallosPrice,
};
