/// <reference path="../pb_data/types.d.ts" />

// ================================================================
// ROUTE: POST /api/costs/snapshot — calculate & upsert current month cost
// Called automatically by the dashboard when yearly_costs is empty.
// NOTE: In PocketBase JSVM (Goja), file-scope helper bindings are not
// reliably available inside router callbacks. Require helpers inside
// each callback so the runtime can always resolve them at request time.
// ================================================================
routerAdd("POST", "/api/costs/snapshot", (e) => {
  const dateHelpers = require(__hooks + "/lib/date-helpers.js");
  if (!e.auth) return e.json(401, { error: "Authentication required" });

  const userId = e.auth.id;
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  let totalMonthlyCost = 0;

  try {
    const subs = $app.findRecordsByFilter(
      "subscriptions",
      "user = {:userId} && inactive = false",
      "", 0, 0, { userId: userId }
    );

    for (const sub of subs) {
      const price = sub.get("price") || 0;
      const frequency = sub.get("frequency") || 1;

      let cycleName = "Monthly";
      try {
        cycleName = $app.findRecordById("cycles", sub.getString("cycle")).getString("name");
      } catch (_) {}

      let rate = 1;
      try {
        rate = $app.findRecordById("currencies", sub.getString("currency")).get("rate") || 1;
      } catch (_) {}

      totalMonthlyCost += dateHelpers.getPricePerMonth(price, cycleName, frequency, rate);
    }
  } catch (err) {
    return e.json(500, { error: "Failed to calculate costs: " + String(err) });
  }

  const rounded = Math.round(totalMonthlyCost * 100) / 100;

  try {
    const col = $app.findCollectionByNameOrId("yearly_costs");
    const existing = $app.findRecordsByFilter(
      "yearly_costs",
      "user = {:userId} && year = {:year} && month = {:month}",
      "", 1, 0, { userId: userId, year: year, month: month }
    );

    if (existing.length > 0) {
      existing[0].set("total", rounded);
      $app.save(existing[0]);
    } else {
      const record = new Record(col);
      record.set("user", userId);
      record.set("year", year);
      record.set("month", month);
      record.set("total", rounded);
      $app.save(record);
    }
  } catch (err) {
    return e.json(500, { error: "Failed to save snapshot: " + String(err) });
  }

  return e.json(200, { year, month, total: rounded });
});
