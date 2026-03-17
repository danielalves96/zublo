/// <reference path="../pb_data/types.d.ts" />

/**
 * Zublo — Cronjobs
 *
 * Scheduled tasks that run in the PocketBase background:
 * 1. updateNextPayment  — Daily at midnight
 * 2. updateExchange     — Daily at 2 AM
 * 3. storeYearlyCost    — 1st of each month at 3 AM
 * 4. sendNotifications  — Daily at 8 AM
 * 5. sendCancellationNotifications — Daily at 9 AM
 * 6. checkForUpdates    — Weekly on Sunday at midnight
 */

// ================================================================
// HELPERS: Date arithmetic
// ================================================================

/**
 * Advances a date by the given cycle and frequency.
 * @param {Date} date
 * @param {string} cycleName - "Daily" | "Weekly" | "Monthly" | "Yearly"
 * @param {number} frequency - multiplier
 * @returns {Date}
 */
function advanceDate(date, cycleName, frequency) {
  const result = new Date(date.getTime());

  switch (cycleName) {
    case "Daily":
      result.setDate(result.getDate() + frequency);
      break;
    case "Weekly":
      result.setDate(result.getDate() + frequency * 7);
      break;
    case "Monthly":
      result.setMonth(result.getMonth() + frequency);
      break;
    case "Yearly":
      result.setFullYear(result.getFullYear() + frequency);
      break;
  }

  return result;
}

/**
 * Calculates the monthly cost of a subscription.
 * @param {number} price
 * @param {string} cycleName
 * @param {number} frequency
 * @param {number} exchangeRate
 * @returns {number}
 */
function getPricePerMonth(price, cycleName, frequency, exchangeRate) {
  const converted = price / (exchangeRate || 1);

  switch (cycleName) {
    case "Daily":
      return converted * frequency * 30;
    case "Weekly":
      return (converted / frequency) * 4.33;
    case "Monthly":
      return converted / frequency;
    case "Yearly":
      return converted / (frequency * 12);
    default:
      return converted;
  }
}

// ================================================================
// HELPERS: Notification providers
// ================================================================

function sendDiscord(webhookUrl, title, message) {
  $http.send({
    url: webhookUrl,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [{ title: title, description: message, color: 3447003 }],
    }),
  });
}

function sendTelegram(botToken, chatId, message) {
  $http.send({
    url: "https://api.telegram.org/bot" + botToken + "/sendMessage",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: "Markdown",
    }),
  });
}

function sendGotify(serverUrl, token, title, message) {
  $http.send({
    url: serverUrl + "/message?token=" + token,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title, message: message, priority: 5 }),
  });
}

function sendPushover(userKey, apiToken, title, message) {
  $http.send({
    url: "https://api.pushover.net/1/messages.json",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: apiToken,
      user: userKey,
      title: title,
      message: message,
    }),
  });
}

function sendNtfy(serverUrl, topic, title, message) {
  const url = (serverUrl || "https://ntfy.sh") + "/" + topic;
  $http.send({
    url: url,
    method: "POST",
    headers: { Title: title },
    body: message,
  });
}

function sendPushPlus(token, title, message) {
  $http.send({
    url: "http://www.pushplus.plus/send",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      token: token,
      title: title,
      content: message,
      template: "markdown",
    }),
  });
}

function sendMattermost(webhookUrl, message) {
  $http.send({
    url: webhookUrl,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: message }),
  });
}

function sendWebhookNotification(webhookUrl, templatePayload) {
  $http.send({
    url: webhookUrl,
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(templatePayload),
  });
}

function sendServerChan(key, title, message) {
  $http.send({
    url: "https://sctapi.ftqq.com/" + key + ".send",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title, desp: message }),
  });
}

function sendEmail(app, toEmail, subject, body) {
  const message = new MailerMessage({
    from: { address: app.settings().meta.senderAddress || "noreply@zublo.app" },
    to: [{ address: toEmail }],
    subject: subject,
    html: body,
  });
  app.newMailClient().send(message);
}

/**
 * Dispatches a notification to all enabled providers for a given config record.
 * Each provider's enabled flag and credentials are stored as flat fields.
 */
function dispatchToAllProviders(app, notifConfig, title, message, subsData) {
  if (notifConfig.getBool("email_enabled")) {
    const to = notifConfig.getString("email_to");
    if (to) try { sendEmail(app, to, title, message); } catch (e) { console.log("[Zublo] email err:", e); }
  }
  if (notifConfig.getBool("discord_enabled")) {
    const url = notifConfig.getString("discord_webhook_url");
    if (url) try { sendDiscord(url, title, message); } catch (e) { console.log("[Zublo] discord err:", e); }
  }
  if (notifConfig.getBool("telegram_enabled")) {
    const token = notifConfig.getString("telegram_bot_token");
    const chatId = notifConfig.getString("telegram_chat_id");
    if (token && chatId) try { sendTelegram(token, chatId, message); } catch (e) { console.log("[Zublo] telegram err:", e); }
  }
  if (notifConfig.getBool("gotify_enabled")) {
    const url = notifConfig.getString("gotify_url");
    const token = notifConfig.getString("gotify_token");
    if (url && token) try { sendGotify(url, token, title, message); } catch (e) { console.log("[Zublo] gotify err:", e); }
  }
  if (notifConfig.getBool("pushover_enabled")) {
    const userKey = notifConfig.getString("pushover_user_key");
    const apiToken = notifConfig.getString("pushover_api_token");
    if (userKey && apiToken) try { sendPushover(userKey, apiToken, title, message); } catch (e) { console.log("[Zublo] pushover err:", e); }
  }
  if (notifConfig.getBool("ntfy_enabled")) {
    const url = notifConfig.getString("ntfy_url");
    const topic = notifConfig.getString("ntfy_topic");
    if (topic) try { sendNtfy(url, topic, title, message); } catch (e) { console.log("[Zublo] ntfy err:", e); }
  }
  if (notifConfig.getBool("pushplus_enabled")) {
    const token = notifConfig.getString("pushplus_token");
    if (token) try { sendPushPlus(token, title, message); } catch (e) { console.log("[Zublo] pushplus err:", e); }
  }
  if (notifConfig.getBool("mattermost_enabled")) {
    const url = notifConfig.getString("mattermost_webhook_url");
    if (url) try { sendMattermost(url, message); } catch (e) { console.log("[Zublo] mattermost err:", e); }
  }
  if (notifConfig.getBool("webhook_enabled")) {
    const url = notifConfig.getString("webhook_url");
    if (url) try { sendWebhookNotification(url, { title, message, subscriptions: subsData }); } catch (e) { console.log("[Zublo] webhook err:", e); }
  }
  if (notifConfig.getBool("serverchan_enabled")) {
    const key = notifConfig.getString("serverchan_send_key");
    if (key) try { sendServerChan(key, title, message); } catch (e) { console.log("[Zublo] serverchan err:", e); }
  }
}

// ================================================================
// CRON 1: Update Next Payment Dates
// ================================================================
cronAdd("updateNextPayment", "0 0 * * *", () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const subs = $app.findRecordsByFilter(
    "subscriptions",
    "inactive = false && auto_renew = true && next_payment <= {:today}",
    "",
    0,
    0,
    { today: today.toISOString().split("T")[0] }
  );

  for (const sub of subs) {
    const cycleRecord = $app.findRecordById("cycles", sub.get("cycle"));
    const cycleName = cycleRecord.get("name");
    const frequency = sub.get("frequency");
    let nextPayment = new Date(sub.get("next_payment"));

    // Advance until next_payment is in the future
    while (nextPayment <= today) {
      nextPayment = advanceDate(nextPayment, cycleName, frequency);
    }

    sub.set("next_payment", nextPayment.toISOString().split("T")[0]);
    $app.save(sub);
  }

  console.log("[Zublo] updateNextPayment: processed " + subs.length + " subscriptions");
});

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

// ================================================================
// CRON 3: Store Yearly/Monthly Cost Snapshot
// ================================================================
cronAdd("storeYearlyCost", "0 3 1 * *", () => {
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

      totalMonthlyCost += getPricePerMonth(price, cycleName, frequency, exchangeRate);
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

// ================================================================
// CRON 4: Send Payment Notifications (hourly, granular reminders)
// ================================================================
cronAdd("sendNotifications", "0 * * * *", () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentHour = now.getHours();
  const todayStr = today.toISOString().split("T")[0];

  // Cleanup old notification_log entries once a day at midnight
  if (currentHour === 0) {
    try {
      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() - 31);
      const cutoffStr = cutoff.toISOString().split("T")[0];
      const oldLogs = $app.findRecordsByFilter(
        "notification_log", "sent_date < {:cutoff}", "", 0, 0, { cutoff: cutoffStr }
      );
      for (const log of oldLogs) $app.delete(log);
    } catch (e) {
      console.log("[Zublo] log cleanup error:", e);
    }
  }

  const users = $app.findRecordsByFilter("users", "", "", 0, 0);

  for (const user of users) {
    const userId = user.id;

    const configs = $app.findRecordsByFilter(
      "notifications_config", "user = {:userId}", "", 1, 0, { userId: userId }
    );
    if (configs.length === 0) continue;
    const notifConfig = configs[0];

    // Parse reminders array — default to [{days:3, hour:8}] if absent
    let reminders = [{ days: 3, hour: 8 }];
    try {
      const raw = notifConfig.get("reminders");
      if (Array.isArray(raw) && raw.length > 0) reminders = raw;
    } catch (_) {}

    // Only process slots that fire at the current hour
    const dueReminders = reminders.filter((r) => Number(r.hour) === currentHour);
    if (dueReminders.length === 0) continue;

    const subs = $app.findRecordsByFilter(
      "subscriptions",
      "user = {:userId} && notify = true && inactive = false",
      "", 0, 0, { userId: userId }
    );
    if (subs.length === 0) continue;

    for (const reminder of dueReminders) {
      const days = Number(reminder.days);
      // target: subscriptions whose next_payment is exactly `days` days from now
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().split("T")[0];
      const reminderKey = days + "d_" + currentHour + "h";

      const grouped = {};

      for (const sub of subs) {
        const nextPayment = sub.getString("next_payment").slice(0, 10);
        if (nextPayment !== targetDateStr) continue;

        // Dedup: skip if already sent for this slot today
        try {
          const existing = $app.findRecordsByFilter(
            "notification_log",
            "subscription_id = {:sid} && user_id = {:uid} && reminder_key = {:key} && sent_date = {:date}",
            "", 1, 0, { sid: sub.id, uid: userId, key: reminderKey, date: todayStr }
          );
          if (existing.length > 0) continue;
        } catch (_) {}

        const payerId = sub.getString("payer") || "default";
        if (!grouped[payerId]) grouped[payerId] = [];

        let currencySymbol = "";
        try {
          const cur = $app.findRecordById("currencies", sub.getString("currency"));
          currencySymbol = cur.getString("symbol");
        } catch (_) {}

        grouped[payerId].push({
          id: sub.id,
          name: sub.getString("name"),
          price: sub.get("price"),
          currency: currencySymbol,
          next_payment: nextPayment,
        });
      }

      if (Object.keys(grouped).length === 0) continue;

      const logCol = $app.findCollectionByNameOrId("notification_log");

      for (const payerId in grouped) {
        const subList = grouped[payerId];
        let payerName = "You";
        if (payerId !== "default") {
          try {
            const payer = $app.findRecordById("household", payerId);
            payerName = payer.getString("name");
          } catch (_) {}
        }

        const daysLabel = days === 0 ? "today" : "in " + days + " day(s)";
        const title = "🔔 Zublo — Upcoming Payments";
        let message = "**" + payerName + "** has upcoming payments (" + daysLabel + "):\n\n";
        for (const sub of subList) {
          message += "• **" + sub.name + "** — " + sub.currency + sub.price;
          message += " (due: " + sub.next_payment + ")\n";
        }

        dispatchToAllProviders($app, notifConfig, title, message, subList);

        // Log each sent subscription so we don't re-send
        for (const sub of subList) {
          try {
            const log = new Record(logCol);
            log.set("subscription_id", sub.id);
            log.set("user_id", userId);
            log.set("reminder_key", reminderKey);
            log.set("sent_date", todayStr);
            $app.save(log);
          } catch (e) {
            console.log("[Zublo] log write error:", e);
          }
        }
      }
    }
  }

  console.log("[Zublo] sendNotifications: completed for hour " + currentHour);
});

// ================================================================
// CRON 5: Send Cancellation Notifications (hourly, granular reminders)
// ================================================================
cronAdd("sendCancellationNotifications", "0 * * * *", () => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const currentHour = now.getHours();
  const todayStr = today.toISOString().split("T")[0];

  const allSubs = $app.findRecordsByFilter(
    "subscriptions",
    "cancellation_date != '' && inactive = false",
    "", 0, 0
  );

  // Group by user
  const byUser = {};
  for (const sub of allSubs) {
    const uid = sub.getString("user");
    if (!byUser[uid]) byUser[uid] = [];
    byUser[uid].push(sub);
  }

  for (const userId in byUser) {
    const configs = $app.findRecordsByFilter(
      "notifications_config", "user = {:userId}", "", 1, 0, { userId: userId }
    );
    if (configs.length === 0) continue;
    const notifConfig = configs[0];

    let reminders = [{ days: 3, hour: 8 }];
    try {
      const raw = notifConfig.get("reminders");
      if (Array.isArray(raw) && raw.length > 0) reminders = raw;
    } catch (_) {}

    const dueReminders = reminders.filter((r) => Number(r.hour) === currentHour);
    if (dueReminders.length === 0) continue;

    for (const reminder of dueReminders) {
      const days = Number(reminder.days);
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + days);
      const targetDateStr = targetDate.toISOString().split("T")[0];
      const reminderKey = "cancel_" + days + "d_" + currentHour + "h";

      const dueSubs = [];
      for (const sub of byUser[userId]) {
        const cancelDate = sub.getString("cancellation_date").slice(0, 10);
        if (cancelDate !== targetDateStr) continue;

        try {
          const existing = $app.findRecordsByFilter(
            "notification_log",
            "subscription_id = {:sid} && user_id = {:uid} && reminder_key = {:key} && sent_date = {:date}",
            "", 1, 0, { sid: sub.id, uid: userId, key: reminderKey, date: todayStr }
          );
          if (existing.length > 0) continue;
        } catch (_) {}

        dueSubs.push({ id: sub.id, name: sub.getString("name"), cancellation_date: cancelDate });
      }

      if (dueSubs.length === 0) continue;

      const daysLabel = days === 0 ? "today" : "in " + days + " day(s)";
      const title = "⚠️ Zublo — Upcoming Cancellations";
      let message = "Subscriptions being cancelled " + daysLabel + ":\n\n";
      for (const sub of dueSubs) {
        message += "• **" + sub.name + "** — cancels on " + sub.cancellation_date + "\n";
      }

      dispatchToAllProviders($app, notifConfig, title, message, dueSubs);

      const logCol = $app.findCollectionByNameOrId("notification_log");
      for (const sub of dueSubs) {
        try {
          const log = new Record(logCol);
          log.set("subscription_id", sub.id);
          log.set("user_id", userId);
          log.set("reminder_key", reminderKey);
          log.set("sent_date", todayStr);
          $app.save(log);
        } catch (e) {
          console.log("[Zublo] cancel log write error:", e);
        }
      }
    }
  }

  console.log("[Zublo] sendCancellationNotifications: completed for hour " + currentHour);
});

// ================================================================
// CRON 7: Auto-mark Payments as Paid
// ================================================================
cronAdd("autoMarkPaid", "0 0 * * *", () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  // Find all subscriptions due today that have auto_mark_paid enabled
  const subs = $app.findRecordsByFilter(
    "subscriptions",
    "inactive = false && auto_mark_paid = true && next_payment = {:today}",
    "",
    0,
    0,
    { today: todayStr }
  );

  let created = 0;
  for (const sub of subs) {
    const userId = sub.get("user");
    try {
      const user = $app.findRecordById("users", userId);
      if (!user.get("payment_tracking")) continue;

      // Skip if already has a payment_record for this due_date
      const existing = $app.findRecordsByFilter(
        "payment_records",
        "subscription_id = {:sid} && due_date = {:date}",
        "",
        1,
        0,
        { sid: sub.id, date: todayStr }
      );
      if (existing.length > 0) continue;

      const col = $app.findCollectionByNameOrId("payment_records");
      const rec = new Record(col);
      rec.set("subscription_id", sub.id);
      rec.set("user", userId);
      rec.set("due_date", todayStr);
      rec.set("paid_at", new Date().toISOString());
      rec.set("auto_paid", true);
      rec.set("amount", sub.get("price"));
      $app.save(rec);
      created++;
    } catch (e) {
      console.log("[Zublo] autoMarkPaid error for sub " + sub.id + ":", e);
    }
  }

  console.log("[Zublo] autoMarkPaid: created " + created + " payment records");
});

// ================================================================
// CRON 8: Overdue Payment Reminders
// ================================================================
cronAdd("overduePaymentReminders", "0 9 * * *", () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split("T")[0];

  // Find active subscriptions whose next_payment is in the past
  const subs = $app.findRecordsByFilter(
    "subscriptions",
    "inactive = false && next_payment < {:today}",
    "",
    0,
    0,
    { today: todayStr }
  );

  let notified = 0;
  for (const sub of subs) {
    const userId = sub.get("user");
    try {
      const user = $app.findRecordById("users", userId);
      if (!user.get("payment_tracking")) continue;

      const dueDate = sub.get("next_payment").split(" ")[0].split("T")[0];

      // Check if already paid
      const paid = $app.findRecordsByFilter(
        "payment_records",
        "subscription_id = {:sid} && due_date = {:date}",
        "",
        1,
        0,
        { sid: sub.id, date: dueDate }
      );
      if (paid.length > 0) continue;

      // Check dedup in notification_log (don't send more than once per day)
      const reminderKey = "overdue_" + dueDate;
      const alreadySent = $app.findRecordsByFilter(
        "notification_log",
        "subscription_id = {:sid} && user_id = {:uid} && reminder_key = {:key} && sent_date = {:date}",
        "",
        1,
        0,
        { sid: sub.id, uid: userId, key: reminderKey, date: todayStr }
      );
      if (alreadySent.length > 0) continue;

      // Get notification config
      let notifConfig;
      try {
        const configs = $app.findRecordsByFilter(
          "notifications_config",
          "user = {:uid}",
          "",
          1,
          0,
          { uid: userId }
        );
        if (configs.length === 0) continue;
        notifConfig = configs[0];
      } catch (_) { continue; }

      const subName = sub.get("name");
      const price   = sub.get("price");
      const title   = "⚠️ Overdue Payment: " + subName;
      const message = "Payment of " + price + " for \"" + subName + "\" was due on " + dueDate + " and has not been recorded yet.";

      dispatchToAllProviders(notifConfig, title, message);

      // Log to prevent duplicate
      try {
        const logCol = $app.findCollectionByNameOrId("notification_log");
        const logRec = new Record(logCol);
        logRec.set("subscription_id", sub.id);
        logRec.set("user_id", userId);
        logRec.set("reminder_key", reminderKey);
        logRec.set("sent_date", todayStr);
        $app.save(logRec);
      } catch (e) {
        console.log("[Zublo] overdue log write error:", e);
      }

      notified++;
    } catch (e) {
      console.log("[Zublo] overduePaymentReminders error for sub " + sub.id + ":", e);
    }
  }

  console.log("[Zublo] overduePaymentReminders: notified " + notified + " overdue payments");
});

// ================================================================
// CRON 6: Check for Updates
// ================================================================
cronAdd("checkForUpdates", "0 0 * * 0", () => {
  try {
    const adminRecords = $app.findRecordsByFilter("admin_settings", "", "", 1, 0);
    if (adminRecords.length === 0) return;

    const admin = adminRecords[0];
    if (!admin.get("update_notification")) return;

    // TODO: Replace with actual Zublo GitHub repo when published
    const res = $http.send({
      url: "https://api.github.com/repos/zublo-app/zublo/releases/latest",
      method: "GET",
      headers: { "User-Agent": "Zublo" },
    });

    if (res.statusCode === 200 && res.json && res.json.tag_name) {
      console.log("[Zublo] Latest version available: " + res.json.tag_name);
    }
  } catch (err) {
    console.log("[Zublo] checkForUpdates error:", err);
  }
});
