/// <reference path="../pb_data/types.d.ts" />

// ================================================================
// CRON 3: Store Yearly/Monthly Cost Snapshot
// NOTE: In PocketBase JSVM (Goja), file-scope helper bindings are not
// reliably available inside cron callbacks. Require helpers inside
// each cron callback so the runtime can always resolve them at run time.
// ================================================================
cronAdd("storeYearlyCost", "0 3 1 * *", () => {
  const dateHelpers = require(__hooks + "/lib/date-helpers.js");
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Get all distinct users with active subscriptions
  const users = $app.findRecordsByFilter("users", "", "", 0, 0);

  for (const user of users) {
    const userId = user.id;
    let totalMonthlyCost = 0;

    const subs = $app.findRecordsByFilter(
      "subscriptions",
      "user = {:userId} && inactive = false",
      "",
      0,
      0,
      { userId: userId }
    );

    for (const sub of subs) {
      const price = sub.get("price") || 0;
      const frequency = sub.get("frequency") || 1;

      let cycleName = "Monthly";
      try {
        const cycleRecord = $app.findRecordById("cycles", sub.get("cycle"));
        cycleName = cycleRecord.get("name");
      } catch (_) {}

      let exchangeRate = 1;
      try {
        const currency = $app.findRecordById("currencies", sub.get("currency"));
        exchangeRate = currency.get("rate") || 1;
      } catch (_) {}

      totalMonthlyCost += dateHelpers.getPricePerMonth(price, cycleName, frequency, exchangeRate);
    }

    // Upsert yearly_costs record
    const yearlyCostsCol = $app.findCollectionByNameOrId("yearly_costs");
    let existing = [];
    try {
      existing = $app.findRecordsByFilter(
        "yearly_costs",
        "user = {:userId} && year = {:year} && month = {:month}",
        "",
        1,
        0,
        { userId: userId, year: year, month: month }
      );
    } catch (_) {}

    const rounded = Math.round(totalMonthlyCost * 100) / 100;
    if (existing.length > 0) {
      existing[0].set("total", rounded);
      $app.save(existing[0]);
    } else {
      const record = new Record(yearlyCostsCol);
      record.set("user", userId);
      record.set("year", year);
      record.set("month", month);
      record.set("total", rounded);
      $app.save(record);
    }
  }

  console.log("[Zublo] storeYearlyCost: snapshot saved for " + year + "/" + month);
});

