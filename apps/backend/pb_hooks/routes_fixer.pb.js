/// <reference path="../pb_data/types.d.ts" />

// ================================================================
// ROUTE: Update exchange rates for the authenticated user
// POST /api/fixer/update
//
// Both Fixer.io and APILayer free plans only return EUR as the base.
// We always fetch with EUR as base, then normalize the rates to the
// user's main currency so existing conversion formulas keep working:
//
//   stored_rate[X] = eur_rates[X] / eur_rates[mainCode]
//
// This means: "how many units of X per 1 unit of main currency".
// Conversion in UI: price_in_main = price_in_X / stored_rate[X]
// ================================================================
routerAdd("POST", "/api/fixer/update", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const userId = e.auth.id;

  // Load fixer settings for this user
  const fixers = $app.findRecordsByFilter(
    "fixer_settings", "user = {:u} && api_key != ''", "", 1, 0, { u: userId }
  );
  if (fixers.length === 0) {
    return e.json(400, { error: "No exchange rate API key configured." });
  }

  const fixer = fixers[0];
  const apiKey = fixer.get("api_key");
  const provider = fixer.get("provider") || "fixer";

  // Resolve the user's main currency code via is_main flag (authoritative)
  const mainCurrencies = $app.findRecordsByFilter("currencies", "user = {:u} && is_main = true", "", 1, 0, { u: userId });
  if (mainCurrencies.length === 0) {
    return e.json(400, { error: "No main currency set." });
  }
  const mainCode = mainCurrencies[0].get("code");

  // Fetch EUR-based rates. Both HTTP and HTTPS work — use HTTPS for compatibility
  // with restricted environments (Docker, corporate proxies, etc.)
  let url, headers;
  if (provider === "apilayer") {
    url = "https://api.apilayer.com/fixer/latest?base=EUR";
    headers = { apikey: apiKey };
  } else {
    url = "https://data.fixer.io/api/latest?access_key=" + apiKey;
    headers = {};
  }

  const res = $http.send({ url: url, method: "GET", headers: headers });

  // Fixer returns HTTP 200 even for errors — check JSON body first
  if (res.json && res.json.success === false) {
    const msg = (res.json.error && res.json.error.info)
      ? res.json.error.info
      : ("Fixer error code " + (res.json.error && res.json.error.code));
    return e.json(502, { error: msg });
  }

  if (res.statusCode !== 200 || !res.json || !res.json.rates) {
    return e.json(502, {
      error: "Exchange rate API failed (HTTP " + res.statusCode + ")",
      detail: res.raw ? res.raw.slice(0, 300) : null,
    });
  }

  // EUR-based rates from the API (e.g. { USD: 1.08, BRL: 5.4, EUR: 1.0 })
  const eurRates = res.json.rates;

  // EUR itself may or may not be included in the rates object
  eurRates["EUR"] = 1;

  // Rate of the main currency relative to EUR
  const mainEurRate = eurRates[mainCode];
  if (!mainEurRate) {
    return e.json(400, {
      error: "Main currency '" + mainCode + "' was not found in the API response. " +
             "Make sure you have the correct currency code (e.g. BRL, USD, EUR)."
    });
  }

  // Normalize every currency so rates are relative to the main currency:
  //   stored_rate[X] = eurRates[X] / eurRates[mainCode]
  // Examples (main = BRL, eurRates = { USD:1.08, BRL:5.4 }):
  //   stored_rate[USD] = 1.08 / 5.4 = 0.2   → 1 BRL = 0.2 USD
  //   stored_rate[EUR] = 1    / 5.4 = 0.185  → 1 BRL = 0.185 EUR
  //   stored_rate[BRL] = 1   (main, always 1)
  const currencies = $app.findRecordsByFilter("currencies", "user = {:u}", "", 0, 0, { u: userId });
  let updated = 0;

  for (let i = 0; i < currencies.length; i++) {
    const code = currencies[i].get("code");
    if (code === mainCode) {
      currencies[i].set("rate", 1);
      $app.save(currencies[i]);
      updated++;
    } else if (eurRates[code] !== undefined) {
      const normalized = eurRates[code] / mainEurRate;
      currencies[i].set("rate", normalized);
      $app.save(currencies[i]);
      updated++;
    }
  }

  // Update exchange_log
  try {
    const logs = $app.findRecordsByFilter("exchange_log", "", "", 1, 0);
    if (logs.length > 0) {
      logs[0].set("last_update", new Date().toISOString());
      logs[0].set("provider", provider);
      logs[0].set("status", "success");
      $app.save(logs[0]);
    } else {
      const lc = $app.findCollectionByNameOrId("exchange_log");
      const lr = new Record(lc);
      lr.set("last_update", new Date().toISOString());
      lr.set("provider", provider);
      lr.set("status", "success");
      $app.save(lr);
    }
  } catch (_) {}

  return e.json(200, { updated: updated, base: mainCode });
});
