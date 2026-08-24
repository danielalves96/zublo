/**
 * Creates the automatic payment records due on `todayStr`.
 *
 * Schedule advancement calls this before moving next_payment (or marking a
 * finite subscription inactive), while the dedicated cron calls it as a
 * fallback. The due-date lookup makes both entry points idempotent when they
 * run in either order.
 *
 * @returns {number} how many payment records were created
 */
function markDuePaymentsPaid(app, todayStr) {
  var recordTypes = require(__hooks + "/lib/pure/record-types.js");
  var tomorrow = new Date(todayStr + "T00:00:00.000Z");
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  var tomorrowStr = tomorrow.toISOString().slice(0, 10);

  var subs = app.findRecordsByFilter(
    "subscriptions",
    "inactive = false && auto_mark_paid = true && " +
      "next_payment >= {:today} && next_payment < {:tomorrow}",
    "",
    0,
    0,
    { today: todayStr, tomorrow: tomorrowStr },
  );

  var created = 0;
  for (var i = 0; i < subs.length; i++) {
    var sub = subs[i];
    if (!recordTypes.isExpense(sub.get("record_type"))) continue;
    var userId = sub.get("user");

    try {
      var user = app.findRecordById("users", userId);
      if (!user.get("payment_tracking")) continue;

      var existing = app.findRecordsByFilter(
        "payment_records",
        "subscription_id = {:sid} && due_date = {:date}",
        "",
        1,
        0,
        { sid: sub.id, date: todayStr },
      );
      if (existing.length > 0) continue;

      var collection = app.findCollectionByNameOrId("payment_records");
      var record = new Record(collection);
      record.set("subscription_id", sub.id);
      record.set("user", userId);
      record.set("due_date", todayStr);
      record.set("paid_at", new Date().toISOString());
      record.set("auto_paid", true);
      record.set("amount", sub.get("price"));
      app.save(record);
      created++;
    } catch (error) {
      console.log("[Zublo] autoMarkPaid error for sub " + sub.id + ":", error);
    }
  }

  return created;
}

module.exports = {
  markDuePaymentsPaid,
};
