/// <reference path="../pb_data/types.d.ts" />

var dateHelpers = require(__hooks + "/lib/date-helpers.js");
var importParsers = require(__hooks + "/lib/pure/subscription-import.js");

// ================================================================
// ROUTE: Subscriptions Import
// ================================================================
routerAdd("POST", "/api/subscriptions/import", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const userId = e.auth.id;
  const data = e.requestInfo().body;

  if (!data.subscriptions || !Array.isArray(data.subscriptions)) {
    return e.json(400, { error: "Invalid format: expected { subscriptions: [...] }" });
  }
  if (data.subscriptions.length === 0) {
    return e.json(400, { error: "No subscriptions to import" });
  }

  // Detect format: Wallos uses PascalCase keys like "Name", "Payment Cycle"
  const isWallos = importParsers.detectWallosFormat(data.subscriptions[0]);

  // ---- Lookup caches to avoid repeated DB queries ----
  const categoryCache = {};
  const paymentMethodCache = {};
  const payerCache = {};
  const currencyByCodeCache = {};
  const cycleCache = {};

  function findOrCreate(collection, filter, params, setFields) {
    try {
      const rows = $app.findRecordsByFilter(collection, filter, "", 1, 0, params);
      if (rows.length > 0) return rows[0].id;
    } catch (_) {}
    try {
      const col = $app.findCollectionByNameOrId(collection);
      const rec = new Record(col);
      for (const [k, v] of Object.entries(setFields)) rec.set(k, v);
      $app.save(rec);
      return rec.id;
    } catch (_) { return ""; }
  }

  function findOrCreateCategory(name) {
    if (!name) return "";
    if (categoryCache[name] !== undefined) return categoryCache[name];
    const id = findOrCreate(
      "categories",
      "user = {:u} && name = {:n}",
      { u: userId, n: name },
      { user: userId, name: name }
    );
    categoryCache[name] = id;
    return id;
  }

  function findOrCreatePaymentMethod(name) {
    if (!name) return "";
    if (paymentMethodCache[name] !== undefined) return paymentMethodCache[name];
    const id = findOrCreate(
      "payment_methods",
      "user = {:u} && name = {:n}",
      { u: userId, n: name },
      { user: userId, name: name }
    );
    paymentMethodCache[name] = id;
    return id;
  }

  function findOrCreatePayer(name) {
    if (!name) return "";
    if (payerCache[name] !== undefined) return payerCache[name];
    const id = findOrCreate(
      "household",
      "user = {:u} && name = {:n}",
      { u: userId, n: name },
      { user: userId, name: name }
    );
    payerCache[name] = id;
    return id;
  }

  function findCurrencyByCode(code) {
    if (!code) return "";
    const key = code.toUpperCase();
    if (currencyByCodeCache[key] !== undefined) return currencyByCodeCache[key];
    try {
      const rows = $app.findRecordsByFilter(
        "currencies", "user = {:u} && code = {:c}", "", 1, 0, { u: userId, c: key }
      );
      currencyByCodeCache[key] = rows.length > 0 ? rows[0].id : "";
      return currencyByCodeCache[key];
    } catch (_) { return ""; }
  }

  // Wallos only exports the currency symbol as prefix of the price string.
  // Try to match against user's currencies first, then fall back to a common map.
  function findCurrencyBySymbol(symbol) {
    if (!symbol) return "";
    try {
      const rows = $app.findRecordsByFilter(
        "currencies", "user = {:u} && symbol = {:s}", "", 1, 0, { u: userId, s: symbol }
      );
      if (rows.length > 0) return rows[0].id;
    } catch (_) {}
    const symbolToCode = {
      "$": "USD", "€": "EUR", "£": "GBP", "¥": "JPY", "₹": "INR",
      "₩": "KRW", "₫": "VND", "฿": "THB", "Fr": "CHF", "R": "ZAR",
      "₺": "TRY", "zł": "PLN", "Kč": "CZK", "₴": "UAH", "₱": "PHP",
      "RM": "MYR", "Rp": "IDR", "₦": "NGN", "kr": "SEK",
      "R$": "BRL", "A$": "AUD", "C$": "CAD", "HK$": "HKD",
      "S$": "SGD", "NZ$": "NZD",
    };
    return findCurrencyByCode(symbolToCode[symbol] || "");
  }

  function findCycleByName(name) {
    if (!name) return "";
    if (cycleCache[name] !== undefined) return cycleCache[name];
    try {
      const rows = $app.findRecordsByFilter("cycles", "name = {:n}", "", 1, 0, { n: name });
      cycleCache[name] = rows.length > 0 ? rows[0].id : "";
      return cycleCache[name];
    } catch (_) { return ""; }
  }

  function getUserMainCurrency() {
    try { return $app.findRecordById("users", userId).get("main_currency"); } catch (_) { return ""; }
  }

  const mainCurrencyId = getUserMainCurrency();
  const subsCol = $app.findCollectionByNameOrId("subscriptions");
  const results = { imported: 0, skipped: 0, errors: [] };

  for (let i = 0; i < data.subscriptions.length; i++) {
    const sub = data.subscriptions[i];
    try {
      let name, price, currencyId, cycleId, frequency, nextPayment;
      let autoRenew, inactive, notes, url, notify, notifyDaysBefore, cancellationDate;
      let categoryId, paymentMethodId, payerId;

      if (isWallos) {
        // ── Wallos format ──
        name = (sub["Name"] || "").trim();
        notes = sub["Notes"] || "";
        url = sub["URL"] || "";
        nextPayment = sub["Next Payment"] || new Date().toISOString().split("T")[0];
        autoRenew = sub["Renewal"] === "Automatic";
        inactive = sub["Active"] === "No" || sub["State"] === "Disabled";
        notify = sub["Notifications"] === "Enabled";
        notifyDaysBefore = 3;
        cancellationDate = sub["Cancellation Date"] || "";

        // "€9.99" → symbol="€", price=9.99
        const priceInfo = importParsers.parseWallosPrice(sub["Price"]);
        let symbol = priceInfo.symbol;
        price = priceInfo.price;
        currencyId = (symbol ? findCurrencyBySymbol(symbol) : "") || mainCurrencyId;

        const { cycleName, frequency: freq } = importParsers.parseCycleAndFrequency(sub["Payment Cycle"]);
        cycleId = findCycleByName(cycleName);
        frequency = freq;

        categoryId = findOrCreateCategory(sub["Category"]);
        paymentMethodId = findOrCreatePaymentMethod(sub["Payment Method"]);
        payerId = findOrCreatePayer(sub["Paid By"]);

      } else {
        // ── Own export format ──
        name = (sub.name || "").trim();
        price = parseFloat(sub.price) || 0;
        notes = sub.notes || "";
        url = sub.url || "";
        nextPayment = sub.next_payment || new Date().toISOString().split("T")[0];
        autoRenew = !!sub.auto_renew;
        inactive = !!sub.inactive;
        notify = !!sub.notify;
        notifyDaysBefore = sub.notify_days_before || 3;
        cancellationDate = sub.cancellation_date || "";

        currencyId = (sub.currency ? findCurrencyByCode(sub.currency) : "") || mainCurrencyId;
        cycleId = findCycleByName(sub.cycle || "Monthly");
        frequency = parseInt(sub.frequency) || 1;

        categoryId = findOrCreateCategory(sub.category);
        paymentMethodId = findOrCreatePaymentMethod(sub.payment_method);
        payerId = findOrCreatePayer(sub.payer);
      }

      if (!name) {
        results.skipped++;
        results.errors.push({ index: i, reason: "Missing name" });
        continue;
      }
      if (!cycleId) {
        results.errors.push({ index: i, name: name, warning: "Unknown cycle, defaulting to Monthly" });
        cycleId = findCycleByName("Monthly");
      }

      const rec = new Record(subsCol);
      rec.set("user", userId);
      rec.set("name", name);
      rec.set("price", price);
      rec.set("frequency", frequency);
      rec.set("next_payment", nextPayment);
      rec.set("auto_renew", autoRenew);
      rec.set("inactive", inactive);
      rec.set("notify", notify);
      rec.set("notify_days_before", notifyDaysBefore);
      rec.set("notes", notes);
      rec.set("url", url);
      if (cancellationDate) rec.set("cancellation_date", cancellationDate);
      if (currencyId) rec.set("currency", currencyId);
      if (cycleId) rec.set("cycle", cycleId);
      if (categoryId) rec.set("category", categoryId);
      if (paymentMethodId) rec.set("payment_method", paymentMethodId);
      if (payerId) rec.set("payer", payerId);

      $app.save(rec);
      results.imported++;
    } catch (err) {
      results.skipped++;
      results.errors.push({ index: i, name: sub.name || sub["Name"] || "?", reason: String(err) });
    }
  }

  return e.json(200, results);
});

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
      start_date: sub.get("start_date"),
      category: categoryName,
      payment_method: paymentName,
      payer: payerName,
      auto_renew: sub.get("auto_renew"),
      inactive: sub.get("inactive"),
      notify: sub.get("notify"),
      notify_days_before: sub.get("notify_days_before"),
      notes: sub.get("notes"),
      url: sub.get("url"),
      cancellation_date: sub.get("cancellation_date"),
    });
  }

  return e.json(200, { subscriptions: exported });
});
