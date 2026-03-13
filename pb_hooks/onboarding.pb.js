/// <reference path="../pb_data/types.d.ts" />

/**
 * Zublo — User Onboarding Hook
 *
 * After a new user is created, generates default per-user data:
 * - 17 default categories
 * - 34 default currencies (EUR as main)
 * - 31 default payment methods
 * - 1 default household member ("Me")
 *
 * Uses onRecordAfterCreateSuccess so the user record is already persisted.
 */

onRecordAfterCreateSuccess((e) => {
  const userId = e.record.id;

  // ================================================================
  // DEFAULT CATEGORIES
  // ================================================================
  const catCol = $app.findCollectionByNameOrId("categories");
  const defaultCategories = [
    "Streaming", "Browsing", "Shopping", "Gaming", "Music",
    "Education", "Health", "Finance", "Cloud Storage", "Software",
    "Communication", "News", "Food", "Transportation", "Utilities",
    "Insurance", "Other",
  ];

  for (const name of defaultCategories) {
    const record = new Record(catCol);
    record.set("name", name);
    record.set("user", userId);
    $app.save(record);
  }

  // ================================================================
  // DEFAULT HOUSEHOLD MEMBER
  // ================================================================
  const householdCol = $app.findCollectionByNameOrId("household");
  const member = new Record(householdCol);
  member.set("name", "Me");
  member.set("user", userId);
  $app.save(member);

  // ================================================================
  // DEFAULT CURRENCIES
  // ================================================================
  const currCol = $app.findCollectionByNameOrId("currencies");
  const defaultCurrencies = [
    { name: "US Dollar", code: "USD", symbol: "$" },
    { name: "Euro", code: "EUR", symbol: "€" },
    { name: "British Pound", code: "GBP", symbol: "£" },
    { name: "Japanese Yen", code: "JPY", symbol: "¥" },
    { name: "Australian Dollar", code: "AUD", symbol: "A$" },
    { name: "Canadian Dollar", code: "CAD", symbol: "C$" },
    { name: "Swiss Franc", code: "CHF", symbol: "CHF" },
    { name: "Chinese Yuan", code: "CNY", symbol: "¥" },
    { name: "Swedish Krona", code: "SEK", symbol: "kr" },
    { name: "New Zealand Dollar", code: "NZD", symbol: "NZ$" },
    { name: "Mexican Peso", code: "MXN", symbol: "MX$" },
    { name: "Singapore Dollar", code: "SGD", symbol: "S$" },
    { name: "Hong Kong Dollar", code: "HKD", symbol: "HK$" },
    { name: "Norwegian Krone", code: "NOK", symbol: "kr" },
    { name: "South Korean Won", code: "KRW", symbol: "₩" },
    { name: "Turkish Lira", code: "TRY", symbol: "₺" },
    { name: "Russian Ruble", code: "RUB", symbol: "₽" },
    { name: "Indian Rupee", code: "INR", symbol: "₹" },
    { name: "Brazilian Real", code: "BRL", symbol: "R$" },
    { name: "South African Rand", code: "ZAR", symbol: "R" },
    { name: "Danish Krone", code: "DKK", symbol: "kr" },
    { name: "Polish Zloty", code: "PLN", symbol: "zł" },
    { name: "Taiwan Dollar", code: "TWD", symbol: "NT$" },
    { name: "Thai Baht", code: "THB", symbol: "฿" },
    { name: "Indonesian Rupiah", code: "IDR", symbol: "Rp" },
    { name: "Hungarian Forint", code: "HUF", symbol: "Ft" },
    { name: "Czech Koruna", code: "CZK", symbol: "Kč" },
    { name: "Israeli Shekel", code: "ILS", symbol: "₪" },
    { name: "Chilean Peso", code: "CLP", symbol: "CL$" },
    { name: "Philippine Peso", code: "PHP", symbol: "₱" },
    { name: "UAE Dirham", code: "AED", symbol: "د.إ" },
    { name: "Colombian Peso", code: "COP", symbol: "COL$" },
    { name: "Saudi Riyal", code: "SAR", symbol: "﷼" },
    { name: "Malaysian Ringgit", code: "MYR", symbol: "RM" },
  ];

  let mainCurrencyId = null;

  for (const cur of defaultCurrencies) {
    const record = new Record(currCol);
    record.set("name", cur.name);
    record.set("code", cur.code);
    record.set("symbol", cur.symbol);
    record.set("rate", 1);
    record.set("is_main", cur.code === "EUR");
    record.set("user", userId);
    $app.save(record);

    if (cur.code === "EUR") {
      mainCurrencyId = record.id;
    }
  }

  // Set user's main_currency relation to EUR
  if (mainCurrencyId) {
    const user = $app.findRecordById("users", userId);
    user.set("main_currency", mainCurrencyId);
    $app.save(user);
  }

  // ================================================================
  // DEFAULT PAYMENT METHODS
  // ================================================================
  const pmCol = $app.findCollectionByNameOrId("payment_methods");
  const defaultPayments = [
    "Visa", "Mastercard", "American Express", "Discover",
    "Diners Club", "JCB", "UnionPay", "Maestro",
    "PayPal", "Apple Pay", "Google Pay", "Samsung Pay",
    "Amazon Pay", "Alipay", "WeChat Pay", "Venmo",
    "Cash App", "Zelle", "Stripe", "Square",
    "Klarna", "Afterpay", "Affirm", "Skrill",
    "Neteller", "Paysafecard", "iDEAL", "Bancontact",
    "Giropay", "Sofort", "Other",
  ];

  for (const name of defaultPayments) {
    const record = new Record(pmCol);
    record.set("name", name);
    record.set("user", userId);
    $app.save(record);
  }

  console.log("[Zublo] Onboarding complete for user " + userId);

  return e.next();
}, "users");
