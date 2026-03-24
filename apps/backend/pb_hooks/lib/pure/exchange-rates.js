function normalizeRatesByMainCurrency(eurRates, mainCode, currencyCodes) {
  const rates = Object.assign({}, eurRates || {});
  rates.EUR = 1;

  const mainRate = rates[mainCode];
  if (!mainRate) {
    throw new Error("Main currency '" + mainCode + "' was not found in the API response.");
  }

  const normalized = {};
  for (let index = 0; index < currencyCodes.length; index++) {
    const code = currencyCodes[index];
    if (code === mainCode) {
      normalized[code] = 1;
    } else if (rates[code] !== undefined) {
      normalized[code] = rates[code] / mainRate;
    }
  }

  return normalized;
}

module.exports = {
  normalizeRatesByMainCurrency,
};
