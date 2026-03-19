/// <reference path="../pb_data/types.d.ts" />

routerAdd("POST", "/api/cron/{job}", function(e) {
  if (!e.auth) throw new ForbiddenError("Authentication required");

  var allUsers = $app.findRecordsByFilter("users", "", "+created", 1, 0);
  if (allUsers.length === 0 || allUsers[0].id !== e.auth.id) {
    throw new ForbiddenError("Admin access required");
  }

  var job = e.request.pathValue("job");

  // ----------------------------------------------------------------
  if (job === "check_subscriptions") {
    var dateHelpers = require(__hooks + "/lib/date-helpers.js");
    var today = new Date();
    today.setHours(0, 0, 0, 0);

    var subs = $app.findRecordsByFilter(
      "subscriptions",
      "inactive = false && auto_renew = true && next_payment <= {:today}",
      "", 0, 0,
      { today: today.toISOString().split("T")[0] }
    );

    for (var i = 0; i < subs.length; i++) {
      var sub = subs[i];
      var cycleRecord = $app.findRecordById("cycles", sub.get("cycle"));
      var nextPayment = new Date(sub.get("next_payment"));
      while (nextPayment <= today) {
        nextPayment = dateHelpers.advanceDate(nextPayment, cycleRecord.get("name"), sub.get("frequency"));
      }
      sub.set("next_payment", nextPayment.toISOString().split("T")[0]);
      $app.save(sub);
    }

    return e.json(200, { message: "check_subscriptions: processed " + subs.length + " subscription(s)" });
  }

  // ----------------------------------------------------------------
  if (job === "send_notifications") {
    var notifHelpers = require(__hooks + "/lib/notifications.js");
    var now = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var todayStr = today.toISOString().split("T")[0];
    var users = $app.findRecordsByFilter("users", "", "", 0, 0);
    var sent = 0;

    for (var ui = 0; ui < users.length; ui++) {
      var userId = users[ui].id;
      var configs = $app.findRecordsByFilter("notifications_config", "user = {:u}", "", 1, 0, { u: userId });
      if (configs.length === 0) continue;
      var notifConfig = configs[0];

      var reminders = [{ days: 3, hour: 8 }];
      try { var raw = notifConfig.get("reminders"); if (Array.isArray(raw) && raw.length > 0) reminders = raw; } catch(_) {}

      var subs = $app.findRecordsByFilter("subscriptions", "user = {:u} && notify = true && inactive = false", "", 0, 0, { u: userId });
      if (subs.length === 0) continue;

      for (var ri = 0; ri < reminders.length; ri++) {
        var days = Number(reminders[ri].days);
        var hour = Number(reminders[ri].hour);
        var targetDate = new Date(today);
        targetDate.setDate(targetDate.getDate() + days);
        var targetStr = targetDate.toISOString().split("T")[0];
        var rKey = days + "d_" + hour + "h";
        var grouped = {};

        for (var si = 0; si < subs.length; si++) {
          var sub = subs[si];
          if (sub.getString("next_payment").slice(0, 10) !== targetStr) continue;
          try {
            var dup = $app.findRecordsByFilter("notification_log",
              "subscription_id={:sid}&&user_id={:uid}&&reminder_key={:k}&&sent_date={:d}",
              "", 1, 0, { sid: sub.id, uid: userId, k: rKey, d: todayStr });
            if (dup.length > 0) continue;
          } catch(_) {}
          var pid = sub.getString("payer") || "default";
          if (!grouped[pid]) grouped[pid] = [];
          var sym = ""; try { sym = $app.findRecordById("currencies", sub.getString("currency")).getString("symbol"); } catch(_) {}
          grouped[pid].push({ id: sub.id, name: sub.getString("name"), price: sub.get("price"), currency: sym, next_payment: targetStr });
        }

        var pids = Object.keys(grouped);
        if (pids.length === 0) continue;
        var logCol = $app.findCollectionByNameOrId("notification_log");

        for (var pi = 0; pi < pids.length; pi++) {
          var pid = pids[pi];
          var subList = grouped[pid];
          var pname = "You";
          if (pid !== "default") { try { pname = $app.findRecordById("household", pid).getString("name"); } catch(_) {} }
          var dl = days === 0 ? "today" : "in " + days + " day(s)";
          var title = "🔔 Zublo — Upcoming Payments";
          var msg = "**" + pname + "** has upcoming payments (" + dl + "):\n\n";
          for (var mi = 0; mi < subList.length; mi++) msg += "• **" + subList[mi].name + "** — " + subList[mi].currency + subList[mi].price + " (due: " + subList[mi].next_payment + ")\n";
          notifHelpers.dispatchToAllProviders($app, notifConfig, title, msg, subList);
          for (var li = 0; li < subList.length; li++) {
            try { var lr = new Record(logCol); lr.set("subscription_id", subList[li].id); lr.set("user_id", userId); lr.set("reminder_key", rKey); lr.set("sent_date", todayStr); $app.save(lr); sent++; } catch(_) {}
          }
        }
      }
    }

    return e.json(200, { message: "send_notifications: dispatched " + sent + " notification(s)" });
  }

  // ----------------------------------------------------------------
  if (job === "update_exchange_rates") {
    var fixers = $app.findRecordsByFilter("fixer_settings", "api_key != ''", "", 0, 0);
    var updated = 0;

    for (var i = 0; i < fixers.length; i++) {
      var fixer = fixers[i];
      var apiKey = fixer.get("api_key");
      var provider = fixer.get("provider") || "fixer";
      var userId = fixer.get("user");
      try {
        // Use is_main flag as authoritative source — user.main_currency may be stale
        var mainCurrencies = $app.findRecordsByFilter("currencies", "user = {:u} && is_main = true", "", 1, 0, { u: userId });
        if (mainCurrencies.length === 0) continue;
        var mainCode = mainCurrencies[0].get("code");

        // Free plans only support EUR as base — use HTTPS for Docker/proxy compatibility
        var url = provider === "apilayer"
          ? "https://api.apilayer.com/fixer/latest?base=EUR"
          : "https://data.fixer.io/api/latest?access_key=" + apiKey;
        var hdrs = provider === "apilayer" ? { apikey: apiKey } : {};
        var res = $http.send({ url: url, method: "GET", headers: hdrs });

        if (res.statusCode === 200 && res.json && res.json.rates) {
          var eurRates = res.json.rates;
          eurRates["EUR"] = 1;
          var mainEurRate = eurRates[mainCode];
          if (!mainEurRate) continue; // unknown main currency, skip

          var curs = $app.findRecordsByFilter("currencies", "user = {:u}", "", 0, 0, { u: userId });
          for (var ci = 0; ci < curs.length; ci++) {
            var code = curs[ci].get("code");
            if (code === mainCode) {
              curs[ci].set("rate", 1);
              $app.save(curs[ci]);
              updated++;
            } else if (eurRates[code] !== undefined) {
              curs[ci].set("rate", eurRates[code] / mainEurRate);
              $app.save(curs[ci]);
              updated++;
            }
          }
          try {
            var logs = $app.findRecordsByFilter("exchange_log", "", "", 1, 0);
            if (logs.length > 0) { logs[0].set("last_update", new Date().toISOString()); $app.save(logs[0]); }
            else { var lc = $app.findCollectionByNameOrId("exchange_log"); var lr = new Record(lc); lr.set("last_update", new Date().toISOString()); $app.save(lr); }
          } catch(_) {}
        }
      } catch(err) { console.log("[Zublo] manual updateExchange error:", err); }
    }

    return e.json(200, { message: "update_exchange_rates: updated " + updated + " rate(s)" });
  }

  // ----------------------------------------------------------------
  if (job === "save_monthly_costs") {
    var dateHelpers = require(__hooks + "/lib/date-helpers.js");
    var now = new Date();
    var year = now.getFullYear();
    var month = now.getMonth() + 1;
    var users = $app.findRecordsByFilter("users", "", "", 0, 0);
    var saved = 0;

    for (var ui = 0; ui < users.length; ui++) {
      var userId = users[ui].id;
      var total = 0;
      var subs = $app.findRecordsByFilter("subscriptions", "user = {:u} && inactive = false", "", 0, 0, { u: userId });
      for (var si = 0; si < subs.length; si++) {
        var sub = subs[si];
        var price = sub.get("price") || 0;
        var freq = sub.get("frequency") || 1;
        var cname = "Monthly"; try { cname = $app.findRecordById("cycles", sub.get("cycle")).get("name"); } catch(_) {}
        var rate = 1; try { rate = $app.findRecordById("currencies", sub.get("currency")).get("rate") || 1; } catch(_) {}
        total += dateHelpers.getPricePerMonth(price, cname, freq, rate);
      }
      var col = $app.findCollectionByNameOrId("yearly_costs");
      var existing = []; try { existing = $app.findRecordsByFilter("yearly_costs", "user={:u}&&year={:y}&&month={:m}", "", 1, 0, { u: userId, y: year, m: month }); } catch(_) {}
      var rounded = Math.round(total * 100) / 100;
      if (existing.length > 0) { existing[0].set("total", rounded); $app.save(existing[0]); }
      else { var rec = new Record(col); rec.set("user", userId); rec.set("year", year); rec.set("month", month); rec.set("total", rounded); $app.save(rec); }
      saved++;
    }

    return e.json(200, { message: "save_monthly_costs: saved snapshot for " + saved + " user(s) (" + year + "/" + month + ")" });
  }

  // ----------------------------------------------------------------
  if (job === "check_updates") {
    try {
      var admins = $app.findRecordsByFilter("admin_settings", "", "", 1, 0);
      if (admins.length === 0) return e.json(200, { message: "check_updates: no admin_settings record found" });
      if (!admins[0].get("update_notification")) return e.json(200, { message: "check_updates: update notifications are disabled" });
      var res = $http.send({ url: "https://api.github.com/repos/danielalves96/zublo/releases/latest", method: "GET", headers: { "User-Agent": "Zublo" } });
      if (res.statusCode === 200 && res.json && res.json.tag_name) {
        try { admins[0].set("latest_version", res.json.tag_name); $app.save(admins[0]); } catch(_) {}
        return e.json(200, { message: "check_updates: latest version is " + res.json.tag_name });
      }
      return e.json(200, { message: "check_updates: no release info (status " + res.statusCode + ")" });
    } catch(err) {
      return e.json(200, { message: "check_updates: error — " + String(err) });
    }
  }

  return e.json(404, { message: "Unknown job: " + job });
});
