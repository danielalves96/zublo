function dateOnly(value) {
  var match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function nonNegativeInteger(value) {
  var parsed = Number(value);
  if (!isFinite(parsed) || parsed <= 0) return 0;
  return Math.floor(parsed);
}

function occurrenceIsAllowed(date, endDate, occurrenceIndex, paymentLimit) {
  var candidate = dateOnly(date);
  var lastDate = dateOnly(endDate);
  var limit = nonNegativeInteger(paymentLimit);
  var index = Math.max(0, Math.floor(Number(occurrenceIndex) || 0));

  if (!candidate) return false;
  if (lastDate && candidate > lastDate) return false;
  if (limit && index >= limit) return false;
  return true;
}

/**
 * Advances every due occurrence through `today` and returns the persisted
 * state. A finite subscription stays on its final due date when completed so
 * the user can still see which payment ended the schedule.
 */
function advanceFiniteSchedule(options) {
  var nextPayment = dateOnly(options && options.nextPayment);
  var today = dateOnly(options && options.today);
  var endDate = dateOnly(options && options.endDate);
  var paymentLimit = nonNegativeInteger(options && options.paymentLimit);
  var paymentsCompleted = Math.max(
    0,
    Math.floor(Number(options && options.paymentsCompleted) || 0),
  );
  var inactive = !!(options && options.inactive);
  var processed = 0;

  if (!nextPayment || !today || inactive) {
    return { nextPayment, paymentsCompleted, inactive, processed };
  }

  if (endDate && endDate < today && nextPayment > today) {
    return { nextPayment, paymentsCompleted, inactive: true, processed };
  }

  while (!inactive && nextPayment <= today) {
    if (!occurrenceIsAllowed(nextPayment, endDate, paymentsCompleted, paymentLimit)) {
      inactive = true;
      break;
    }

    if (paymentLimit) paymentsCompleted += 1;
    processed += 1;

    if (paymentLimit && paymentsCompleted >= paymentLimit) {
      inactive = true;
      break;
    }

    var current = new Date(nextPayment + "T00:00:00.000Z");
    var advanced = options.advanceDate(current, options.cycleName, options.frequency);
    var advancedDate = dateOnly(advanced && advanced.toISOString());
    if (!advancedDate || advancedDate <= nextPayment) break;

    if (endDate && advancedDate > endDate) {
      inactive = true;
      break;
    }

    nextPayment = advancedDate;
  }

  return { nextPayment, paymentsCompleted, inactive, processed };
}

module.exports = {
  advanceFiniteSchedule,
  dateOnly,
  nonNegativeInteger,
  occurrenceIsAllowed,
};
