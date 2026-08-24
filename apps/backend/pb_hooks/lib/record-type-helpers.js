var recordTypeBase = typeof __hooks !== "undefined" ? __hooks + "/lib" : __dirname;
var recordTypes = require(recordTypeBase + "/pure/record-types.js");

function cycleNameById(app, cycleId) {
  if (!cycleId) return "";
  try {
    return app.findRecordById("cycles", String(cycleId)).get("name") || "";
  } catch (_) {
    return "";
  }
}

function findOneTimeCycleId(app) {
  try {
    var cycles = app.findRecordsByFilter("cycles", "name = {:name}", "", 1, 0, {
      name: recordTypes.ONE_TIME_CYCLE,
    });
    return cycles.length > 0 ? cycles[0].id : "";
  } catch (_) {
    return "";
  }
}

/**
 * Single entry point every write path uses to keep record_type and cycle in
 * sync.  See validateRecordTypeCycle in lib/pure/record-types.js for why the
 * pairing has to hold.
 *
 * Credits are forced onto the One-Time cycle with frequency 1 (this is what
 * the subscription form already does client-side).  Expenses keep the
 * requested cycle unless it is One-Time, which is rejected.
 *
 * Returns { cycleId, frequency, error }.  A non-empty `error` means the
 * caller must abort and surface the message.
 */
function resolveCycleForRecordType(app, recordType, cycleId, frequency) {
  if (recordTypes.isCredit(recordType)) {
    var oneTimeId = findOneTimeCycleId(app);
    if (!oneTimeId) {
      return {
        cycleId: "",
        frequency: 1,
        error: "The One-Time cycle is missing; run migration 0022",
      };
    }
    return { cycleId: oneTimeId, frequency: 1, error: "" };
  }

  var invalid = recordTypes.validateRecordTypeCycle(
    recordType,
    cycleNameById(app, cycleId),
  );
  if (invalid) return { cycleId: "", frequency: 1, error: invalid };

  return { cycleId: cycleId, frequency: frequency, error: "" };
}

/**
 * Applies the resolved cycle plus the flags that make no sense on a credit
 * (a credit is never renewed, never notified about, never marked paid).
 */
function applyRecordTypeToRecord(app, record, recordType) {
  var type = recordTypes.normalizeRecordType(recordType);
  var resolved = resolveCycleForRecordType(
    app,
    type,
    record.get("cycle"),
    record.get("frequency") || 1,
  );
  if (resolved.error) return resolved.error;

  record.set("record_type", type);
  record.set("cycle", resolved.cycleId);
  record.set("frequency", resolved.frequency);

  if (type === "credit") {
    record.set("auto_renew", false);
    record.set("notify", false);
    record.set("auto_mark_paid", false);
  }

  return "";
}

module.exports = {
  applyRecordTypeToRecord,
  cycleNameById,
  findOneTimeCycleId,
  resolveCycleForRecordType,
};
