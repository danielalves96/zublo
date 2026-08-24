const path = require("node:path");

const helpers = require("../../pb_hooks/lib/record-type-helpers.js");

const ONE_TIME_ID = "cycle_one_time";
const MONTHLY_ID = "cycle_monthly";

const CYCLES = {
  [ONE_TIME_ID]: "One-Time",
  [MONTHLY_ID]: "Monthly",
};

function fakeApp({ withOneTime = true } = {}) {
  return {
    findRecordById: (collection, id) => {
      if (collection === "cycles" && CYCLES[id]) {
        return { get: () => CYCLES[id] };
      }
      throw new Error("not found");
    },
    findRecordsByFilter: (collection, _filter, _sort, _limit, _offset, params) => {
      if (collection !== "cycles" || params.name !== "One-Time") return [];
      return withOneTime ? [{ id: ONE_TIME_ID }] : [];
    },
  };
}

function fakeRecord(values = {}) {
  const state = { ...values };
  return {
    get: (key) => state[key],
    set: (key, value) => {
      state[key] = value;
    },
    state,
  };
}

beforeAll(() => {
  globalThis.__hooks = path.join(__dirname, "../../pb_hooks");
});

describe("cycleNameById", () => {
  it("resolves a cycle name and degrades to empty on anything unusable", () => {
    const app = fakeApp();
    expect(helpers.cycleNameById(app, MONTHLY_ID)).toBe("Monthly");
    expect(helpers.cycleNameById(app, "")).toBe("");
    expect(helpers.cycleNameById(app, "missing")).toBe("");
  });
});

describe("findOneTimeCycleId", () => {
  it("finds the One-Time cycle, or returns empty when the migration has not run", () => {
    expect(helpers.findOneTimeCycleId(fakeApp())).toBe(ONE_TIME_ID);
    expect(helpers.findOneTimeCycleId(fakeApp({ withOneTime: false }))).toBe("");
  });

  it("returns empty when the lookup throws", () => {
    const app = {
      findRecordsByFilter: () => {
        throw new Error("db down");
      },
    };
    expect(helpers.findOneTimeCycleId(app)).toBe("");
  });
});

describe("resolveCycleForRecordType", () => {
  it("forces a credit onto One-Time with frequency 1, whatever was requested", () => {
    const resolved = helpers.resolveCycleForRecordType(fakeApp(), "credit", MONTHLY_ID, 6);
    expect(resolved).toEqual({ cycleId: ONE_TIME_ID, frequency: 1, error: "" });
  });

  it("reports a missing One-Time cycle instead of silently writing an empty relation", () => {
    const resolved = helpers.resolveCycleForRecordType(
      fakeApp({ withOneTime: false }),
      "credit",
      MONTHLY_ID,
      1,
    );
    expect(resolved.error).toBe("The One-Time cycle is missing; run migration 0022");
  });

  it("rejects a One-Time expense", () => {
    const resolved = helpers.resolveCycleForRecordType(fakeApp(), "expense", ONE_TIME_ID, 1);
    expect(resolved.error).toBe("The One-Time cycle is reserved for credits");
  });

  it("leaves a recurring expense untouched", () => {
    const resolved = helpers.resolveCycleForRecordType(fakeApp(), "expense", MONTHLY_ID, 3);
    expect(resolved).toEqual({ cycleId: MONTHLY_ID, frequency: 3, error: "" });
  });
});

describe("applyRecordTypeToRecord", () => {
  it("repairs a recurring credit and strips the flags that make no sense on it", () => {
    const record = fakeRecord({
      cycle: MONTHLY_ID,
      frequency: 6,
      auto_renew: true,
      notify: true,
      auto_mark_paid: true,
    });

    expect(helpers.applyRecordTypeToRecord(fakeApp(), record, "credit")).toBe("");
    expect(record.state).toMatchObject({
      record_type: "credit",
      cycle: ONE_TIME_ID,
      frequency: 1,
      auto_renew: false,
      notify: false,
      auto_mark_paid: false,
    });
  });

  it("keeps an expense's own flags and cycle", () => {
    const record = fakeRecord({ cycle: MONTHLY_ID, frequency: 2, auto_renew: true, notify: true });

    expect(helpers.applyRecordTypeToRecord(fakeApp(), record, "expense")).toBe("");
    expect(record.state).toMatchObject({
      record_type: "expense",
      cycle: MONTHLY_ID,
      frequency: 2,
      auto_renew: true,
      notify: true,
    });
  });

  it("treats a legacy empty record_type as an expense", () => {
    const record = fakeRecord({ cycle: MONTHLY_ID });
    expect(helpers.applyRecordTypeToRecord(fakeApp(), record, "")).toBe("");
    expect(record.state.record_type).toBe("expense");
  });

  it("refuses a One-Time expense without mutating the record", () => {
    const record = fakeRecord({ cycle: ONE_TIME_ID, frequency: 1 });

    expect(helpers.applyRecordTypeToRecord(fakeApp(), record, "expense")).toBe(
      "The One-Time cycle is reserved for credits",
    );
    expect(record.state.record_type).toBeUndefined();
  });

  it("defaults a missing frequency to 1", () => {
    const record = fakeRecord({ cycle: MONTHLY_ID });
    helpers.applyRecordTypeToRecord(fakeApp(), record, "expense");
    expect(record.state.frequency).toBe(1);
  });
});
