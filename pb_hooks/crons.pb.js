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
 * Dispatches a notification to a specific provider.
 */
function dispatchNotification(app, config, title, message, subsData) {
  const cfg = config.get("config") || {};
  const type = config.get("type");

  try {
    switch (type) {
      case "discord":
        sendDiscord(cfg.webhook_url, title, message);
        break;
      case "telegram":
        sendTelegram(cfg.bot_token, cfg.chat_id, message);
        break;
      case "gotify":
        sendGotify(cfg.url, cfg.token, title, message);
        break;
      case "pushover":
        sendPushover(cfg.user_key, cfg.api_token, title, message);
        break;
      case "ntfy":
        sendNtfy(cfg.url, cfg.topic, title, message);
        break;
      case "pushplus":
        sendPushPlus(cfg.token, title, message);
        break;
      case "mattermost":
        sendMattermost(cfg.webhook_url, message);
        break;
      case "webhook":
        sendWebhookNotification(cfg.url, {
          title: title,
          message: message,
          subscriptions: subsData,
        });
        break;
      case "serverchan":
        sendServerChan(cfg.key, title, message);
        break;
      case "email":
        if (cfg.email) {
          sendEmail(app, cfg.email, title, message);
        }
        break;
    }
  } catch (err) {
    console.log("[Zublo] Notification error (" + type + "):", err);
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

    if (existing.length > 0) {
      existing[0].set("cost", Math.round(totalMonthlyCost * 100) / 100);
      $app.save(existing[0]);
    } else {
      const record = new Record(yearlyCostsCol);
      record.set("user", userId);
      record.set("year", year);
      record.set("month", month);
      record.set("cost", Math.round(totalMonthlyCost * 100) / 100);
      $app.save(record);
    }
  }

  console.log("[Zublo] storeYearlyCost: snapshot saved for " + year + "/" + month);
});

// ================================================================
// CRON 4: Send Payment Notifications
// ================================================================
cronAdd("sendNotifications", "0 8 * * *", () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const users = $app.findRecordsByFilter("users", "", "", 0, 0);

  for (const user of users) {
    const userId = user.id;

    // Get enabled notification configs
    const configs = $app.findRecordsByFilter(
      "notifications_config",
      "user = {:userId} && enabled = true",
      "",
      0,
      0,
      { userId: userId }
    );

    if (configs.length === 0) continue;

    // Get notifiable subscriptions
    const subs = $app.findRecordsByFilter(
      "subscriptions",
      "user = {:userId} && notify = true && inactive = false",
      "",
      0,
      0,
      { userId: userId }
    );

    // Group by payer, check if notification is due
    const grouped = {};

    for (const sub of subs) {
      const nextPayment = new Date(sub.get("next_payment"));
      const daysBefore = sub.get("notify_days_before") || 1;
      const notifyDate = new Date(nextPayment.getTime());
      notifyDate.setDate(notifyDate.getDate() - daysBefore);

      if (notifyDate <= today) {
        const payerId = sub.get("payer") || "default";
        if (!grouped[payerId]) grouped[payerId] = [];

        let currencySymbol = "";
        try {
          const cur = $app.findRecordById("currencies", sub.get("currency"));
          currencySymbol = cur.get("symbol");
        } catch (_) {}

        grouped[payerId].push({
          name: sub.get("name"),
          price: sub.get("price"),
          currency: currencySymbol,
          next_payment: sub.get("next_payment"),
        });
      }
    }

    // Send notifications for each payer group
    for (const payerId in grouped) {
      const subs = grouped[payerId];
      let payerName = "You";

      if (payerId !== "default") {
        try {
          const payer = $app.findRecordById("household", payerId);
          payerName = payer.get("name");
        } catch (_) {}
      }

      // Build message
      const title = "🔔 Zublo — Upcoming Payments";
      let message = "**" + payerName + "** has upcoming payments:\n\n";

      for (const sub of subs) {
        message += "• **" + sub.name + "** — " + sub.currency + sub.price;
        message += " (due: " + sub.next_payment + ")\n";
      }

      // Dispatch to all enabled providers
      for (const config of configs) {
        dispatchNotification($app, config, title, message, subs);
      }
    }
  }

  console.log("[Zublo] sendNotifications: completed");
});

// ================================================================
// CRON 5: Send Cancellation Notifications
// ================================================================
cronAdd("sendCancellationNotifications", "0 9 * * *", () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find subscriptions with upcoming cancellation dates
  const subs = $app.findRecordsByFilter(
    "subscriptions",
    "cancellation_date != '' && inactive = false",
    "",
    0,
    0
  );

  // Group by user
  const byUser = {};

  for (const sub of subs) {
    const cancelDate = new Date(sub.get("cancellation_date"));
    const daysBefore = sub.get("notify_days_before") || 1;
    const notifyDate = new Date(cancelDate.getTime());
    notifyDate.setDate(notifyDate.getDate() - daysBefore);

    if (notifyDate <= today && cancelDate >= today) {
      const userId = sub.get("user");
      if (!byUser[userId]) byUser[userId] = [];

      byUser[userId].push({
        name: sub.get("name"),
        cancellation_date: sub.get("cancellation_date"),
      });
    }
  }

  for (const userId in byUser) {
    const configs = $app.findRecordsByFilter(
      "notifications_config",
      "user = {:userId} && enabled = true",
      "",
      0,
      0,
      { userId: userId }
    );

    if (configs.length === 0) continue;

    const title = "⚠️ Zublo — Upcoming Cancellations";
    let message = "The following subscriptions are being cancelled soon:\n\n";

    for (const sub of byUser[userId]) {
      message += "• **" + sub.name + "** — cancels on " + sub.cancellation_date + "\n";
    }

    for (const config of configs) {
      dispatchNotification($app, config, title, message, byUser[userId]);
    }
  }

  console.log("[Zublo] sendCancellationNotifications: completed");
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
