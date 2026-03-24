/// <reference path="../pb_data/types.d.ts" />

var authHeaders = require(__hooks + "/lib/pure/auth-headers.js");

function extractApiKey(e) {
  return authHeaders.extractBearerToken(e.request.header.get("Authorization"));
}

// ================================================================
// GET /api/api-keys  — list keys for the authenticated user
// ================================================================
routerAdd("GET", "/api/api-keys", function(e) {
  try {
    if (!e.auth) return e.json(401, { error: "Authentication required" });

    var keys = $app.findRecordsByFilter(
      "api_keys", "user = {:userId}", "", 0, 0, { userId: e.auth.id }
    );

    var items = [];
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var perms = [];
      try { perms = JSON.parse(k.get("permissions") || "[]"); } catch (_) {}
      items.push({
        id: k.id,
        name: k.get("name"),
        key_prefix: k.get("key_prefix"),
        permissions: perms,
        last_used_at: k.get("last_used_at") || null,
        created: k.get("created_at") || null,
      });
    }

    return e.json(200, { items: items });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// POST /api/api-keys  — create a new API key (plain key returned once)
// ================================================================
routerAdd("POST", "/api/api-keys", function(e) {
  try {
    if (!e.auth) return e.json(401, { error: "Authentication required" });

    var validPerms = [
      "subscriptions:read", "subscriptions:write",
      "calendar:read", "statistics:read",
      "categories:read", "categories:write",
      "payment_methods:read", "payment_methods:write",
      "household:read", "household:write",
      "currencies:read", "currencies:write"
    ];
    var body = e.requestInfo().body;
    var name = String(body.name || "").trim();
    var rawPerms = body.permissions;

    var permissions = [];
    if (rawPerms && typeof rawPerms === "object") {
      for (var i = 0; i < rawPerms.length; i++) permissions.push(String(rawPerms[i]));
    }

    if (!name) return e.json(400, { error: "Name is required" });
    if (permissions.length === 0) return e.json(400, { error: "At least one permission is required" });
    for (var pi = 0; pi < permissions.length; pi++) {
      if (validPerms.indexOf(permissions[pi]) === -1) {
        return e.json(400, { error: "Invalid permission: " + permissions[pi] });
      }
    }

    var existing = $app.findRecordsByFilter(
      "api_keys", "user = {:userId}", "", 0, 0, { userId: e.auth.id }
    );
    if (existing.length >= 20) return e.json(400, { error: "Maximum of 20 API keys reached" });

    var now = new Date().toISOString();
    var token = $security.randomString(40);
    var plainKey = "wk_" + token;
    var keyHash = $security.sha256(plainKey);
    var keyPrefix = plainKey.substring(0, 14) + "...";

    var col = $app.findCollectionByNameOrId("api_keys");
    var record = new Record(col);
    record.set("name", name);
    record.set("user", e.auth.id);
    record.set("key_hash", keyHash);
    record.set("key_prefix", keyPrefix);
    record.set("permissions", JSON.stringify(permissions));
    record.set("created_at", now);
    $app.save(record);

    return e.json(200, {
      id: record.id,
      name: name,
      key: plainKey,
      key_prefix: keyPrefix,
      permissions: permissions,
      last_used_at: null,
      created: now,
    });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// DELETE /api/api-keys/:id
// ================================================================
routerAdd("DELETE", "/api/api-keys/{id}", function(e) {
  try {
    if (!e.auth) return e.json(401, { error: "Authentication required" });

    var id = e.request.pathValue("id");
    var keyRecord;
    try { keyRecord = $app.findRecordById("api_keys", id); }
    catch (_) { return e.json(404, { error: "API key not found" }); }

    if (keyRecord.get("user") !== e.auth.id) return e.json(403, { error: "Forbidden" });

    $app.delete(keyRecord);
    return e.json(200, { success: true });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// PUT /api/api-keys/:id  — update API key name and permissions
// ================================================================
routerAdd("PUT", "/api/api-keys/{id}", function(e) {
  try {
    if (!e.auth) return e.json(401, { error: "Authentication required" });

    var id = e.request.pathValue("id");
    var keyRecord;
    try { keyRecord = $app.findRecordById("api_keys", id); }
    catch (_) { return e.json(404, { error: "API key not found" }); }

    if (keyRecord.get("user") !== e.auth.id) return e.json(403, { error: "Forbidden" });

    var body = e.requestInfo().body;
    var name = body.name ? String(body.name).trim() : null;
    var rawPerms = body.permissions;

    if (name !== null) {
      if (!name) return e.json(400, { error: "Name cannot be empty" });
      keyRecord.set("name", name);
    }

    if (rawPerms !== undefined && rawPerms !== null && typeof rawPerms === "object") {
      var validPerms = [
        "subscriptions:read", "subscriptions:write",
        "calendar:read", "statistics:read",
        "categories:read", "categories:write",
        "payment_methods:read", "payment_methods:write",
        "household:read", "household:write",
        "currencies:read", "currencies:write"
      ];
      var permissions = [];
      for (var i = 0; i < rawPerms.length; i++) {
        var p = String(rawPerms[i]);
        if (validPerms.indexOf(p) === -1) return e.json(400, { error: "Invalid permission: " + p });
        permissions.push(p);
      }
      if (permissions.length === 0) return e.json(400, { error: "At least one permission is required" });
      keyRecord.set("permissions", JSON.stringify(permissions));
    }

    $app.save(keyRecord);

    var perms = [];
    try { perms = JSON.parse(keyRecord.get("permissions") || "[]"); } catch (_) {}

    return e.json(200, {
      id: keyRecord.id,
      name: keyRecord.get("name"),
      key_prefix: keyRecord.get("key_prefix"),
      permissions: perms,
      last_used_at: keyRecord.get("last_used_at") || null,
      created: keyRecord.get("created_at") || null,
    });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// GET /api/external/subscriptions  (requires subscriptions:read)
// ================================================================
routerAdd("GET", "/api/external/subscriptions", function(e) {
  try {
    var rawKey = extractApiKey(e);

    // inline resolveApiKey
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "subscriptions:read") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var subs = $app.findRecordsByFilter(
      "subscriptions", "user = {:userId}", "next_payment", 0, 0, { userId: userId }
    );

    var items = [];
    for (var i = 0; i < subs.length; i++) {
      var sub = subs[i];
      var currencySymbol = "", currencyCode = "", cycleName = "";
      var categoryName = "", paymentMethodName = "", payerName = "";

      try { var cur = $app.findRecordById("currencies", sub.get("currency")); currencySymbol = cur.get("symbol"); currencyCode = cur.get("code"); } catch (_) {}
      try { var cyc = $app.findRecordById("cycles", sub.get("cycle")); cycleName = cyc.get("name"); } catch (_) {}
      try { var cat = $app.findRecordById("categories", sub.get("category")); categoryName = cat.get("name"); } catch (_) {}
      try { var pm = $app.findRecordById("payment_methods", sub.get("payment_method")); paymentMethodName = pm.get("name"); } catch (_) {}
      try { var py = $app.findRecordById("household", sub.get("payer")); payerName = py.get("name"); } catch (_) {}

      items.push({
        id: sub.id,
        name: sub.get("name"),
        price: sub.get("price"),
        currency_symbol: currencySymbol,
        currency_code: currencyCode,
        frequency: sub.get("frequency"),
        cycle: cycleName,
        next_payment: sub.get("next_payment"),
        auto_renew: sub.get("auto_renew"),
        inactive: sub.get("inactive"),
        notes: sub.get("notes") || null,
        url: sub.get("url") || null,
        category: categoryName || null,
        payment_method: paymentMethodName || null,
        payer: payerName || null,
      });
    }

    return e.json(200, { items: items, total: items.length });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// GET /api/external/subscriptions/:id (requires subscriptions:read)
// ================================================================
routerAdd("GET", "/api/external/subscriptions/{id}", function(e) {
  try {
    var rawKey = extractApiKey(e);

    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "subscriptions:read") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var id = e.request.pathValue("id");
    var sub;
    try { sub = $app.findRecordById("subscriptions", id); } catch (_) { return e.json(404, { error: "Not found" }); }
    if (sub.get("user") !== userId) return e.json(403, { error: "Forbidden" });

    var currencySymbol = "", currencyCode = "", cycleName = "";
    var categoryName = "", paymentMethodName = "", payerName = "";

    try { var cur = $app.findRecordById("currencies", sub.get("currency")); currencySymbol = cur.get("symbol"); currencyCode = cur.get("code"); } catch (_) {}
    try { var cyc = $app.findRecordById("cycles", sub.get("cycle")); cycleName = cyc.get("name"); } catch (_) {}
    try { var cat = $app.findRecordById("categories", sub.get("category")); categoryName = cat.get("name"); } catch (_) {}
    try { var pm = $app.findRecordById("payment_methods", sub.get("payment_method")); paymentMethodName = pm.get("name"); } catch (_) {}
    try { var py = $app.findRecordById("household", sub.get("payer")); payerName = py.get("name"); } catch (_) {}

    return e.json(200, {
      id: sub.id,
      name: sub.get("name"),
      price: sub.get("price"),
      currency_id: sub.get("currency"),
      currency_symbol: currencySymbol,
      currency_code: currencyCode,
      frequency: sub.get("frequency"),
      cycle_id: sub.get("cycle"),
      cycle: cycleName,
      next_payment: sub.get("next_payment"),
      auto_renew: sub.get("auto_renew"),
      inactive: sub.get("inactive"),
      notes: sub.get("notes") || null,
      url: sub.get("url") || null,
      category_id: sub.get("category"),
      category: categoryName || null,
      payment_method_id: sub.get("payment_method"),
      payment_method: paymentMethodName || null,
      payer_id: sub.get("payer"),
      payer: payerName || null,
    });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// GET /api/external/cycles  (requires subscriptions:read)
// ================================================================
routerAdd("GET", "/api/external/cycles", function(e) {
  try {
    var rawKey = extractApiKey(e);

    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "subscriptions:read") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var records = $app.findRecordsByFilter("cycles", "", "name", 0, 0);
    var items = [];
    for (var i = 0; i < records.length; i++) {
      items.push({ id: records[i].id, name: records[i].get("name") });
    }
    return e.json(200, { items: items, total: items.length });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// POST /api/external/subscriptions  (requires subscriptions:write)
// ================================================================
routerAdd("POST", "/api/external/subscriptions", function(e) {
  try {
    var rawKey = extractApiKey(e);

    // inline resolveApiKey
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "subscriptions:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var body = e.requestInfo().body;
    var name = String(body.name || "").trim();
    var price = parseFloat(body.price) || 0;
    var currencyId = String(body.currency_id || "").trim();
    var cycleId = String(body.cycle_id || "").trim();
    var frequency = parseInt(body.frequency) || 1;
    var nextPayment = String(body.next_payment || "").trim();

    if (!name) return e.json(400, { error: "name is required" });
    if (!currencyId) return e.json(400, { error: "currency_id is required" });
    if (!cycleId) return e.json(400, { error: "cycle_id is required" });
    if (!nextPayment) return e.json(400, { error: "next_payment is required (YYYY-MM-DD)" });

    try {
      var cur = $app.findRecordById("currencies", currencyId);
      if (cur.get("user") !== userId) return e.json(400, { error: "Invalid currency_id" });
    } catch (_) { return e.json(400, { error: "currency_id not found" }); }

    var col = $app.findCollectionByNameOrId("subscriptions");
    var record = new Record(col);
    record.set("name", name);
    record.set("price", price);
    record.set("currency", currencyId);
    record.set("cycle", cycleId);
    record.set("frequency", frequency);
    record.set("next_payment", nextPayment);
    record.set("user", userId);
    record.set("auto_renew", body.auto_renew === true);
    record.set("notify", body.notify === true);
    record.set("notify_days_before", parseInt(body.notify_days_before) || 3);
    record.set("inactive", body.inactive === true);
    if (body.notes) record.set("notes", String(body.notes));
    if (body.url) record.set("url", String(body.url));
    if (body.category_id) record.set("category", String(body.category_id));
    if (body.payment_method_id) record.set("payment_method", String(body.payment_method_id));
    if (body.payer_id) record.set("payer", String(body.payer_id));

    $app.save(record);
    return e.json(200, { id: record.id, name: name, price: price, next_payment: nextPayment });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// GET /api/external/statistics  (requires statistics:read)
// ================================================================
routerAdd("GET", "/api/external/statistics", function(e) {
  try {
    var rawKey = extractApiKey(e);

    // inline resolveApiKey
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "statistics:read") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var subs = $app.findRecordsByFilter(
      "subscriptions", "user = {:userId} && inactive = false", "", 0, 0, { userId: userId }
    );

    var mainCurrencySymbol = "", mainCurrencyCode = "";
    try {
      var mainCurs = $app.findRecordsByFilter(
        "currencies", "user = {:userId} && is_main = true", "", 1, 0, { userId: userId }
      );
      if (mainCurs.length > 0) { mainCurrencySymbol = mainCurs[0].get("symbol"); mainCurrencyCode = mainCurs[0].get("code"); }
    } catch (_) {}

    var totalMonthly = 0;
    var breakdown = [];

    for (var i = 0; i < subs.length; i++) {
      var sub = subs[i];
      var cycleMultiplier = 1;
      try {
        var cyc = $app.findRecordById("cycles", sub.get("cycle"));
        var cn = cyc.get("name");
        if (cn === "Daily") cycleMultiplier = 30.44;
        else if (cn === "Weekly") cycleMultiplier = 4.33;
        else if (cn === "Monthly") cycleMultiplier = 1;
        else if (cn === "Yearly") cycleMultiplier = 1 / 12;
      } catch (_) {}

      var freq = sub.get("frequency") || 1;
      var price = sub.get("price") || 0;
      var monthly = (price / freq) * cycleMultiplier;
      totalMonthly += monthly;
      breakdown.push({ id: sub.id, name: sub.get("name"), price: price, monthly_equivalent: Math.round(monthly * 100) / 100 });
    }

    return e.json(200, {
      active_count: subs.length,
      total_monthly: Math.round(totalMonthly * 100) / 100,
      total_yearly: Math.round(totalMonthly * 12 * 100) / 100,
      currency_symbol: mainCurrencySymbol,
      currency_code: mainCurrencyCode,
      breakdown: breakdown,
    });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// GET /api/external/categories  (requires categories:read)
// ================================================================
routerAdd("GET", "/api/external/categories", function(e) {
  try {
    var rawKey = extractApiKey(e);

    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "categories:read") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var records = $app.findRecordsByFilter(
      "categories", "user = {:userId}", "name", 0, 0, { userId: userId }
    );

    var items = [];
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      items.push({
        id: r.id,
        name: r.get("name"),
      });
    }

    return e.json(200, { items: items, total: items.length });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// POST /api/external/categories  (requires categories:write)
// ================================================================
routerAdd("POST", "/api/external/categories", function(e) {
  try {
    var rawKey = extractApiKey(e);

    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "categories:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var body = e.requestInfo().body;
    var name = String(body.name || "").trim();
    if (!name) return e.json(400, { error: "name is required" });

    var col = $app.findCollectionByNameOrId("categories");
    var record = new Record(col);
    record.set("name", name);
    record.set("user", userId);

    $app.save(record);
    return e.json(200, { id: record.id, name: name });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// GET /api/external/payment-methods  (requires payment_methods:read)
// ================================================================
routerAdd("GET", "/api/external/payment-methods", function(e) {
  try {
    var rawKey = extractApiKey(e);

    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "payment_methods:read") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var records = $app.findRecordsByFilter(
      "payment_methods", "user = {:userId}", "name", 0, 0, { userId: userId }
    );

    var items = [];
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      items.push({
        id: r.id,
        name: r.get("name"),
      });
    }

    return e.json(200, { items: items, total: items.length });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// POST /api/external/payment-methods  (requires payment_methods:write)
// ================================================================
routerAdd("POST", "/api/external/payment-methods", function(e) {
  try {
    var rawKey = extractApiKey(e);

    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "payment_methods:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var body = e.requestInfo().body;
    var name = String(body.name || "").trim();
    if (!name) return e.json(400, { error: "name is required" });

    var col = $app.findCollectionByNameOrId("payment_methods");
    var record = new Record(col);
    record.set("name", name);
    record.set("user", userId);

    $app.save(record);
    return e.json(200, { id: record.id, name: name });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// GET /api/external/household  (requires household:read)
// ================================================================
routerAdd("GET", "/api/external/household", function(e) {
  try {
    var rawKey = extractApiKey(e);

    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "household:read") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var records = $app.findRecordsByFilter(
      "household", "user = {:userId}", "name", 0, 0, { userId: userId }
    );

    var items = [];
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      items.push({
        id: r.id,
        name: r.get("name"),
      });
    }

    return e.json(200, { items: items, total: items.length });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// POST /api/external/household  (requires household:write)
// ================================================================
routerAdd("POST", "/api/external/household", function(e) {
  try {
    var rawKey = extractApiKey(e);

    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "household:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var body = e.requestInfo().body;
    var name = String(body.name || "").trim();
    if (!name) return e.json(400, { error: "name is required" });

    var col = $app.findCollectionByNameOrId("household");
    var record = new Record(col);
    record.set("name", name);
    record.set("user", userId);

    $app.save(record);
    return e.json(200, { id: record.id, name: name });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// GET /api/external/currencies  (requires currencies:read)
// ================================================================
routerAdd("GET", "/api/external/currencies", function(e) {
  try {
    var rawKey = extractApiKey(e);

    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "currencies:read") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var records = $app.findRecordsByFilter(
      "currencies", "user = {:userId}", "code", 0, 0, { userId: userId }
    );

    var items = [];
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      items.push({
        id: r.id,
        code: r.get("code"),
        symbol: r.get("symbol"),
        is_main: r.get("is_main")
      });
    }

    return e.json(200, { items: items, total: items.length });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// POST /api/external/currencies  (requires currencies:write)
// ================================================================
routerAdd("POST", "/api/external/currencies", function(e) {
  try {
    var rawKey = extractApiKey(e);

    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "currencies:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var body = e.requestInfo().body;
    var code = String(body.code || "").trim();
    var symbol = String(body.symbol || "").trim();
    if (!code) return e.json(400, { error: "code is required" });
    if (!symbol) return e.json(400, { error: "symbol is required" });

    var col = $app.findCollectionByNameOrId("currencies");
    var record = new Record(col);
    record.set("code", code);
    record.set("symbol", symbol);
    record.set("user", userId);

    $app.save(record);
    return e.json(200, { id: record.id, code: code, symbol: symbol });
  } catch (err) { return e.json(500, { error: String(err) }); }
});


// ================================================================
// DELETE /api/external/subscriptions  (requires subscriptions:write)
// ================================================================
routerAdd("DELETE", "/api/external/subscriptions/{id}", function(e) {
  try {
    var rawKey = extractApiKey(e);
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "subscriptions:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var id = e.request.pathValue("id");
    var record;
    try { record = $app.findRecordById("subscriptions", id); } catch (_) { return e.json(404, { error: "Not found" }); }
    if (record.get("user") !== userId) return e.json(403, { error: "Forbidden" });

    $app.delete(record);
    return e.json(200, { success: true });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// PUT /api/external/subscriptions  (requires subscriptions:write)
// ================================================================
routerAdd("PUT", "/api/external/subscriptions/{id}", function(e) {
  try {
    var rawKey = extractApiKey(e);
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "subscriptions:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var id = e.request.pathValue("id");
    var record;
    try { record = $app.findRecordById("subscriptions", id); } catch (_) { return e.json(404, { error: "Not found" }); }
    if (record.get("user") !== userId) return e.json(403, { error: "Forbidden" });

    var body = e.requestInfo().body;

    if (body.name !== undefined) record.set("name", String(body.name).trim());
    if (body.price !== undefined) record.set("price", parseFloat(body.price) || 0);
    if (body.currency_id !== undefined) record.set("currency", String(body.currency_id).trim());
    if (body.cycle_id !== undefined) record.set("cycle", String(body.cycle_id).trim());
    if (body.frequency !== undefined) record.set("frequency", parseInt(body.frequency) || 1);
    if (body.next_payment !== undefined) record.set("next_payment", String(body.next_payment).trim());
    if (body.auto_renew !== undefined) record.set("auto_renew", body.auto_renew === true);
    if (body.notify !== undefined) record.set("notify", body.notify === true);
    if (body.notify_days_before !== undefined) record.set("notify_days_before", parseInt(body.notify_days_before) || 3);
    if (body.inactive !== undefined) record.set("inactive", body.inactive === true);
    if (body.notes !== undefined) record.set("notes", String(body.notes));
    if (body.url !== undefined) record.set("url", String(body.url));
    if (body.category_id !== undefined) record.set("category", String(body.category_id));
    if (body.payment_method_id !== undefined) record.set("payment_method", String(body.payment_method_id));
    if (body.payer_id !== undefined) record.set("payer", String(body.payer_id));

    $app.save(record);
    return e.json(200, { success: true, id: record.id });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// DELETE /api/external/categories  (requires categories:write)
// ================================================================
routerAdd("DELETE", "/api/external/categories/{id}", function(e) {
  try {
    var rawKey = extractApiKey(e);
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "categories:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var id = e.request.pathValue("id");
    var record;
    try { record = $app.findRecordById("categories", id); } catch (_) { return e.json(404, { error: "Not found" }); }
    if (record.get("user") !== userId) return e.json(403, { error: "Forbidden" });

    $app.delete(record);
    return e.json(200, { success: true });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// PUT /api/external/categories  (requires categories:write)
// ================================================================
routerAdd("PUT", "/api/external/categories/{id}", function(e) {
  try {
    var rawKey = extractApiKey(e);
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "categories:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var id = e.request.pathValue("id");
    var record;
    try { record = $app.findRecordById("categories", id); } catch (_) { return e.json(404, { error: "Not found" }); }
    if (record.get("user") !== userId) return e.json(403, { error: "Forbidden" });

    var body = e.requestInfo().body;

    if (body.name !== undefined) record.set("name", String(body.name).trim());

    $app.save(record);
    return e.json(200, { success: true, id: record.id });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// DELETE /api/external/payment-methods  (requires payment_methods:write)
// ================================================================
routerAdd("DELETE", "/api/external/payment-methods/{id}", function(e) {
  try {
    var rawKey = extractApiKey(e);
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "payment_methods:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var id = e.request.pathValue("id");
    var record;
    try { record = $app.findRecordById("payment_methods", id); } catch (_) { return e.json(404, { error: "Not found" }); }
    if (record.get("user") !== userId) return e.json(403, { error: "Forbidden" });

    $app.delete(record);
    return e.json(200, { success: true });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// PUT /api/external/payment-methods  (requires payment_methods:write)
// ================================================================
routerAdd("PUT", "/api/external/payment-methods/{id}", function(e) {
  try {
    var rawKey = extractApiKey(e);
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "payment_methods:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var id = e.request.pathValue("id");
    var record;
    try { record = $app.findRecordById("payment_methods", id); } catch (_) { return e.json(404, { error: "Not found" }); }
    if (record.get("user") !== userId) return e.json(403, { error: "Forbidden" });

    var body = e.requestInfo().body;

    if (body.name !== undefined) record.set("name", String(body.name).trim());

    $app.save(record);
    return e.json(200, { success: true, id: record.id });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// DELETE /api/external/household  (requires household:write)
// ================================================================
routerAdd("DELETE", "/api/external/household/{id}", function(e) {
  try {
    var rawKey = extractApiKey(e);
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "household:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var id = e.request.pathValue("id");
    var record;
    try { record = $app.findRecordById("household", id); } catch (_) { return e.json(404, { error: "Not found" }); }
    if (record.get("user") !== userId) return e.json(403, { error: "Forbidden" });

    $app.delete(record);
    return e.json(200, { success: true });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// PUT /api/external/household  (requires household:write)
// ================================================================
routerAdd("PUT", "/api/external/household/{id}", function(e) {
  try {
    var rawKey = extractApiKey(e);
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "household:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var id = e.request.pathValue("id");
    var record;
    try { record = $app.findRecordById("household", id); } catch (_) { return e.json(404, { error: "Not found" }); }
    if (record.get("user") !== userId) return e.json(403, { error: "Forbidden" });

    var body = e.requestInfo().body;

    if (body.name !== undefined) record.set("name", String(body.name).trim());

    $app.save(record);
    return e.json(200, { success: true, id: record.id });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// DELETE /api/external/currencies  (requires currencies:write)
// ================================================================
routerAdd("DELETE", "/api/external/currencies/{id}", function(e) {
  try {
    var rawKey = extractApiKey(e);
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "currencies:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var id = e.request.pathValue("id");
    var record;
    try { record = $app.findRecordById("currencies", id); } catch (_) { return e.json(404, { error: "Not found" }); }
    if (record.get("user") !== userId) return e.json(403, { error: "Forbidden" });

    $app.delete(record);
    return e.json(200, { success: true });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// PUT /api/external/currencies  (requires currencies:write)
// ================================================================
routerAdd("PUT", "/api/external/currencies/{id}", function(e) {
  try {
    var rawKey = extractApiKey(e);
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "currencies:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var id = e.request.pathValue("id");
    var record;
    try { record = $app.findRecordById("currencies", id); } catch (_) { return e.json(404, { error: "Not found" }); }
    if (record.get("user") !== userId) return e.json(403, { error: "Forbidden" });

    var body = e.requestInfo().body;

    if (body.code !== undefined) record.set("code", String(body.code).trim());
    if (body.symbol !== undefined) record.set("symbol", String(body.symbol).trim());

    $app.save(record);
    return e.json(200, { success: true, id: record.id });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// PATCH /api/external/subscriptions/{id}/status  (requires subscriptions:write)
// ================================================================
routerAdd("PATCH", "/api/external/subscriptions/{id}/status", function(e) {
  try {
    var rawKey = extractApiKey(e);
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "subscriptions:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var id = e.request.pathValue("id");
    var record;
    try { record = $app.findRecordById("subscriptions", id); } catch (_) { return e.json(404, { error: "Not found" }); }
    if (record.get("user") !== userId) return e.json(403, { error: "Forbidden" });

    var body = e.requestInfo().body;
    if (body.inactive === undefined) return e.json(400, { error: "inactive field is required" });

    record.set("inactive", body.inactive === true);
    $app.save(record);

    return e.json(200, { success: true, inactive: record.get("inactive") });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// POST /api/external/subscriptions/{id}/mark-paid (requires subscriptions:write)
// ================================================================
routerAdd("POST", "/api/external/subscriptions/{id}/mark-paid", function(e) {
  try {
    var rawKey = extractApiKey(e);
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "subscriptions:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var id = e.request.pathValue("id");
    var sub;
    try { sub = $app.findRecordById("subscriptions", id); } catch (_) { return e.json(404, { error: "Not found" }); }
    if (sub.get("user") !== userId) return e.json(403, { error: "Forbidden" });

    var body = e.requestInfo().body;
    var amount = parseFloat(body.amount) || sub.get("price");
    var paymentDate = body.payment_date || sub.get("next_payment");

    // Create payment record
    var pCol = $app.findCollectionByNameOrId("payments");
    var payment = new Record(pCol);
    payment.set("subscription", id);
    payment.set("amount", amount);
    payment.set("payment_date", paymentDate);
    payment.set("user", userId);
    $app.save(payment);

    // Update next_payment (Simplified logic for now, usually handles cycle increment)
    // For now we just return success like the internal tool
    return e.json(200, { success: true, payment_id: payment.id });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// POST /api/external/subscriptions/batch (requires subscriptions:write)
// ================================================================
routerAdd("POST", "/api/external/subscriptions/batch", function(e) {
  try {
    var rawKey = extractApiKey(e);
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "subscriptions:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var body = e.requestInfo().body;
    var items = body.items;
    if (!items || !Array.isArray(items)) return e.json(400, { error: "items array is required" });

    var col = $app.findCollectionByNameOrId("subscriptions");
    var created = [];

    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var record = new Record(col);
        record.set("user", userId);
        record.set("name", String(item.name || "Unnamed"));
        record.set("price", parseFloat(item.price) || 0);
        record.set("currency", String(item.currency_id));
        record.set("cycle", String(item.cycle_id));
        record.set("next_payment", String(item.next_payment));
        // Add other fields optionally...
        $app.save(record);
        created.push({ id: record.id, name: item.name });
    }

    return e.json(200, { success: true, created: created });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// POST /api/external/categories/bulk-rename (requires categories:write)
// ================================================================
routerAdd("POST", "/api/external/categories/bulk-rename", function(e) {
  try {
    var rawKey = extractApiKey(e);
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "categories:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var body = e.requestInfo().body;
    var fromId = body.from_id;
    var toId = body.to_id;

    if (!fromId || !toId) return e.json(400, { error: "from_id and to_id are required" });

    // Update all subscriptions with fromId to toId
    var subs = $app.findRecordsByFilter("subscriptions", "user = {:u} && category = {:f}", "", 0, 0, { u: userId, f: fromId });
    for (var i = 0; i < subs.length; i++) {
        subs[i].set("category", toId);
        $app.save(subs[i]);
    }

    return e.json(200, { success: true, updated_count: subs.length });
  } catch (err) { return e.json(500, { error: String(err) }); }
});

// ================================================================
// PUT /api/external/currencies/{id}/main (requires currencies:write)
// ================================================================
routerAdd("PUT", "/api/external/currencies/{id}/main", function(e) {
  try {
    var rawKey = extractApiKey(e);
    var userId = null;
    if (rawKey) {
      var kh = $security.sha256(rawKey);
      var kRows = $app.findRecordsByFilter("api_keys", "key_hash = {:h}", "", 1, 0, { h: kh });
      if (kRows && kRows.length > 0) {
        var kRec = kRows[0];
        var kPerms = [];
        try { kPerms = JSON.parse(kRec.get("permissions") || "[]"); } catch (_) {}
        for (var ki = 0; ki < kPerms.length; ki++) {
          if (kPerms[ki] === "currencies:write") { userId = kRec.get("user"); break; }
        }
        if (userId) { kRec.set("last_used_at", new Date().toISOString()); try { $app.save(kRec); } catch (_) {} }
      }
    }
    if (!userId) return e.json(401, { error: "Invalid or insufficient API key" });

    var id = e.request.pathValue("id");
    var record;
    try { record = $app.findRecordById("currencies", id); } catch (_) { return e.json(404, { error: "Not found" }); }
    if (record.get("user") !== userId) return e.json(403, { error: "Forbidden" });

    // Mark all other as not main
    var all = $app.findRecordsByFilter("currencies", "user = {:u}", "", 0, 0, { u: userId });
    for (var i = 0; i < all.length; i++) {
        all[i].set("is_main", all[i].id === id);
        $app.save(all[i]);
    }

    return e.json(200, { success: true, main_currency_id: id });
  } catch (err) { return e.json(500, { error: String(err) }); }
});
