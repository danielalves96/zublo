/// <reference path="../pb_data/types.d.ts" />

// ================================================================
// CRON 2: Update Exchange Rates (twice daily at 00:00 and 12:00)
//
// Free plans on Fixer.io and APILayer only support EUR as the base.
// We always fetch EUR-based rates and normalize them to each user's
// main currency:  stored_rate[X] = eurRates[X] / eurRates[mainCode]
// ================================================================
cronAdd("updateExchange", "0 0,12 * * *", () => {
  const fixerRecords = $app.findRecordsByFilter("fixer_settings", "api_key != ''", "", 0, 0);

  for (const fixer of fixerRecords) {
    const apiKey = fixer.get("api_key");
    const provider = fixer.get("provider") || "fixer";
    const userId = fixer.get("user");

    // Use is_main flag as authoritative source — user.main_currency may be stale
    const mainCurrencies = $app.findRecordsByFilter("currencies", "user = {:u} && is_main = true", "", 1, 0, { u: userId });
    if (mainCurrencies.length === 0) continue;
    const mainCode = mainCurrencies[0].get("code");

    // Always fetch with EUR as base — use HTTPS for Docker/proxy compatibility
    let url, headers;
    if (provider === "apilayer") {
      url = "https://api.apilayer.com/fixer/latest?base=EUR";
      headers = { apikey: apiKey };
    } else {
      url = "https://data.fixer.io/api/latest?access_key=" + apiKey;
      headers = {};
    }

    try {
      const res = $http.send({ url: url, method: "GET", headers: headers });

      if (res.statusCode === 200 && res.json && res.json.rates) {
        const eurRates = res.json.rates;
        eurRates["EUR"] = 1;

        const mainEurRate = eurRates[mainCode];
        if (!mainEurRate) {
          console.log("[Zublo] updateExchange: unknown main currency '" + mainCode + "' for user " + userId);
          continue;
        }

        const currencies = $app.findRecordsByFilter(
          "currencies", "user = {:u}", "", 0, 0, { u: userId }
        );

        for (const cur of currencies) {
          const code = cur.get("code");
          if (code === mainCode) {
            cur.set("rate", 1);
            $app.save(cur);
          } else if (eurRates[code] !== undefined) {
            cur.set("rate", eurRates[code] / mainEurRate);
            $app.save(cur);
          }
        }

        try {
          const logs = $app.findRecordsByFilter("exchange_log", "", "", 1, 0);
          if (logs.length > 0) {
            logs[0].set("last_update", new Date().toISOString());
            $app.save(logs[0]);
          } else {
            const logCol = $app.findCollectionByNameOrId("exchange_log");
            const logRecord = new Record(logCol);
            logRecord.set("last_update", new Date().toISOString());
            $app.save(logRecord);
          }
        } catch (_) {}

        console.log("[Zublo] updateExchange: updated rates for user " + userId + " (base: " + mainCode + ")");
      }
    } catch (err) {
      console.log("[Zublo] updateExchange error:", err);
    }
  }
});
