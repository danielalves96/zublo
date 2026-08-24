/**
 * Shared advancement for subscription schedules.
 *
 * Two entry points advance next_payment: the nightly `updateNextPayment` cron
 * and the admin-triggered `check_subscriptions` job. They drifted apart once
 * already — the admin job kept an unbounded loop that walked straight past
 * end_date and payment_limit — so the query and the write live here instead of
 * being copied into both hooks.
 *
 * DUE_FILTER note: an unset PocketBase date field is stored as the empty
 * string and date filters are string comparisons, so `end_date < :today` on its
 * own matches every subscription that has no end date at all. The `!= ''` guard
 * is what keeps this a due-only query instead of a nightly full-table rewrite.
 */
var DUE_FILTER =
  "inactive = false && auto_renew = true && " +
  "(next_payment <= {:today} || (end_date != '' && end_date < {:today}))";

/**
 * Advances every subscription that is due as of `todayStr`.
 *
 * `app` is passed in rather than read from the `$app` global so this stays
 * callable from any hook callback and directly exercisable in tests.
 *
 * @returns {number} how many subscriptions were processed
 */
function advanceDueSubscriptions(app, todayStr) {
  var dateHelpers = require(__hooks + "/lib/date-helpers.js");
  var subscriptionLimits = require(__hooks + "/lib/pure/subscription-limits.js");

  var subs = app.findRecordsByFilter("subscriptions", DUE_FILTER, "", 0, 0, {
    today: todayStr,
  });

  for (var i = 0; i < subs.length; i++) {
    var sub = subs[i];
    var cycleRecord = app.findRecordById("cycles", sub.get("cycle"));

    var result = subscriptionLimits.advanceFiniteSchedule({
      nextPayment: sub.get("next_payment"),
      today: todayStr,
      cycleName: cycleRecord.get("name"),
      frequency: sub.get("frequency"),
      endDate: sub.get("end_date"),
      paymentLimit: sub.get("payment_limit"),
      paymentsCompleted: sub.get("payments_completed"),
      inactive: sub.get("inactive"),
      advanceDate: dateHelpers.advanceDate,
    });

    sub.set("next_payment", result.nextPayment);
    sub.set("payments_completed", result.paymentsCompleted);
    sub.set("inactive", result.inactive);
    app.save(sub);
  }

  return subs.length;
}

module.exports = {
  DUE_FILTER,
  advanceDueSubscriptions,
};
