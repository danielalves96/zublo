/// <reference path="../pb_data/types.d.ts" />

// ================================================================
// CRON 2: Update Exchange Rates
// ================================================================
cronAdd("updateExchange", "0 2 * * *", () => {
  const fixerRecords = $app.findRecordsByFilter("fixer_settings", "api_key != ''", "", 0, 0);

  for (const fixer of fixerRecords) {
    const apiKey = fixer.get("api_key");
    const provider = fixer.get("provider") || "fixer";
    const userId = fixer.get("user");

    // Get user's main currency
    const user = $app.findRecordById("users", userId);
    const mainCurrencyId = user.get("main_currency");
    if (!mainCurrencyId) continue;

    const mainCurrency = $app.findRecordById("currencies", mainCurrencyId);
    const baseCurrency = mainCurrency.get("code");

    // Build API URL based on provider
    let url, headers;
    if (provider === "apilayer") {
      url = "https://api.apilayer.com/fixer/latest?base=" + baseCurrency;
      headers = { apikey: apiKey };
    } else {
      url = "http://data.fixer.io/api/latest?access_key=" + apiKey + "&base=" + baseCurrency;
      headers = {};
    }

    try {
      const res = $http.send({ url: url, method: "GET", headers: headers });

      if (res.statusCode === 200 && res.json && res.json.rates) {
        const rates = res.json.rates;

        // Update all user currencies with new rates
        const currencies = $app.findRecordsByFilter(
          "currencies",
          "user = {:userId}",
          "",
          0,
          0,
          { userId: userId }
        );

        for (const cur of currencies) {
          const code = cur.get("code");
          if (rates[code] !== undefined) {
            cur.set("rate", rates[code]);
            $app.save(cur);
          }
        }

        // Update exchange log
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

        console.log("[Zublo] updateExchange: updated rates for user " + userId);
      }
    } catch (err) {
      console.log("[Zublo] updateExchange error:", err);
    }
  }
});

