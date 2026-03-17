/// <reference path="../pb_data/types.d.ts" />

var dateHelpers = require(__hooks + "/lib/date-helpers.js");
var notifHelpers = require(__hooks + "/lib/notifications.js");

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
      nextPayment = dateHelpers.advanceDate(nextPayment, cycleName, frequency);
    }

    sub.set("next_payment", nextPayment.toISOString().split("T")[0]);
    $app.save(sub);
  }

  console.log("[Zublo] updateNextPayment: processed " + subs.length + " subscriptions");
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

        notifHelpers.dispatchToAllProviders($app, notifConfig, title, message, subList);

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

      notifHelpers.dispatchToAllProviders($app, notifConfig, title, message, dueSubs);

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

      notifHelpers.dispatchToAllProviders($app, notifConfig, title, message);

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

