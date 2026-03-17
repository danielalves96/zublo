/// <reference path="../pb_data/types.d.ts" />

var dateHelpers = require(__hooks + "/lib/date-helpers.js");

// ================================================================
// ROUTE: Subscription Clone
// ================================================================
routerAdd("POST", "/api/subscription/clone", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const data = e.requestInfo().body;
  const subId = data.id;

  if (!subId) {
    return e.json(400, { error: "Missing subscription id" });
  }

  const original = $app.findRecordById("subscriptions", subId);

  if (original.get("user") !== e.auth.id) {
    throw new ForbiddenError("Not your subscription");
  }

  const col = $app.findCollectionByNameOrId("subscriptions");
  const clone = new Record(col);

  // Copy all fields except id
  const fieldsToCopy = [
    "name", "price", "frequency", "next_payment", "auto_renew",
    "start_date", "notes", "url", "notify", "notify_days_before",
    "inactive", "cancellation_date", "currency", "cycle",
    "payment_method", "payer", "category", "user",
  ];

  for (const field of fieldsToCopy) {
    clone.set(field, original.get(field));
  }

  // Logo needs special handling (file copy)
  $app.save(clone);

  return e.json(200, { id: clone.id, message: "Subscription cloned" });
});

// ================================================================
// ROUTE: Subscription Renew
// ================================================================
routerAdd("POST", "/api/subscription/renew", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const data = e.requestInfo().body;
  const subId = data.id;

  if (!subId) {
    return e.json(400, { error: "Missing subscription id" });
  }

  const sub = $app.findRecordById("subscriptions", subId);

  if (sub.get("user") !== e.auth.id) {
    throw new ForbiddenError("Not your subscription");
  }

  const cycleRecord = $app.findRecordById("cycles", sub.get("cycle"));
  const cycleName = cycleRecord.get("name");
  const frequency = sub.get("frequency");
  let nextPayment = new Date(sub.get("next_payment"));
  const today = new Date();

  // Advance to next payment after today
  while (nextPayment <= today) {
    nextPayment = dateHelpers.advanceDate(nextPayment, cycleName, frequency);
  }

  sub.set("next_payment", nextPayment.toISOString().split("T")[0]);
  $app.save(sub);

  return e.json(200, { next_payment: sub.get("next_payment") });
});

// ================================================================
// ROUTE: Subscriptions Export
// ================================================================
routerAdd("GET", "/api/subscriptions/export", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const userId = e.auth.id;

  const subs = $app.findRecordsByFilter(
    "subscriptions", "user = {:userId}", "name", 0, 0, { userId: userId }
  );

  const exported = [];

  for (const sub of subs) {
    let currencySymbol = "", currencyCode = "";
    try {
      const cur = $app.findRecordById("currencies", sub.get("currency"));
      currencySymbol = cur.get("symbol");
      currencyCode = cur.get("code");
    } catch (_) { }

    let cycleName = "";
    try {
      const cycle = $app.findRecordById("cycles", sub.get("cycle"));
      cycleName = cycle.get("name");
    } catch (_) { }

    let paymentName = "";
    try {
      const pm = $app.findRecordById("payment_methods", sub.get("payment_method"));
      paymentName = pm.get("name");
    } catch (_) { }

    let categoryName = "";
    try {
      const cat = $app.findRecordById("categories", sub.get("category"));
      categoryName = cat.get("name");
    } catch (_) { }

    let payerName = "";
    try {
      const payer = $app.findRecordById("household", sub.get("payer"));
      payerName = payer.get("name");
    } catch (_) { }

    exported.push({
      name: sub.get("name"),
      price: sub.get("price"),
      currency: currencyCode,
      currency_symbol: currencySymbol,
      cycle: cycleName,
      frequency: sub.get("frequency"),
      next_payment: sub.get("next_payment"),
      category: categoryName,
      payment_method: paymentName,
      payer: payerName,
      auto_renew: sub.get("auto_renew"),
      inactive: sub.get("inactive"),
      notes: sub.get("notes"),
      url: sub.get("url"),
    });
  }

  return e.json(200, { subscriptions: exported });
});
