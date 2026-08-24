const fs = require("node:fs");
const path = require("node:path");

const { HOOKS_DIR, hookFiles } = require("./helpers/hook-source.js");
const { DUE_FILTER } = require("../../pb_hooks/lib/subscription-schedule.js");

/**
 * Static guards for the hooks that advance subscription schedules.
 *
 * finite_schedules.integration.test.ts proves the runtime behaviour against a
 * real PocketBase, but it is skipped whenever the gitignored binary is missing
 * (see INTEGRATION_TESTING.md), which is the default on a clean checkout. These
 * checks always run, so a regression cannot land unnoticed just because nobody
 * fetched the binary.
 */
const files = hookFiles();
const sourceOf = (name) => {
  const file = files.find((candidate) => candidate.name === name);
  if (!file) throw new Error("missing hook file: " + name);
  return file.source;
};

const SCHEDULE_ADVANCERS = ["cron_subscriptions.pb.js", "routes_cron.pb.js"];

describe("subscription schedule hooks", () => {
  it("keeps the due-subscription query guarded against unset end dates", () => {
    // An unset PocketBase date field is the empty string and date filters are
    // string comparisons, so a bare `end_date < :today` matches every record
    // with no end date, turning a due-only job into a full-table rewrite.
    expect(DUE_FILTER).toContain("end_date != '' && end_date < {:today}");

    const remainder = DUE_FILTER.split("end_date != '' && end_date < {:today}").join("");
    expect(remainder).not.toMatch(/end_date\s*<\s*\{:today\}/);
    // PocketBase persists date fields with a midnight timestamp. A plain
    // `<= YYYY-MM-DD` comparison excludes occurrences on the calendar day,
    // so the upper bound must be the start of tomorrow instead.
    expect(DUE_FILTER).toContain("next_payment < {:tomorrow}");
    expect(DUE_FILTER).not.toContain("next_payment <= {:today}");
  });

  it.each(SCHEDULE_ADVANCERS)("%s delegates to the shared advancement", (name) => {
    const source = sourceOf(name);

    expect(source).toContain("lib/subscription-schedule.js");
    expect(source).toContain("advanceDueSubscriptions");

    // Reimplementing the query or the walk here is exactly how the admin job
    // drifted away from the nightly cron the first time.
    expect(source).not.toContain("advanceFiniteSchedule");
    expect(source).not.toMatch(/end_date\s*<\s*\{:today\}/);
    expect(source).not.toMatch(/while\s*\(\s*nextPayment\s*<=\s*today\s*\)/);
  });

  it("marks due payments before advancing finite schedules", () => {
    const source = fs.readFileSync(
      path.join(HOOKS_DIR, "lib/subscription-schedule.js"),
      "utf8",
    );
    const markPaidAt = source.indexOf("paymentTracking.markDuePaymentsPaid");
    const findDueAt = source.indexOf('findRecordsByFilter("subscriptions", DUE_FILTER');

    expect(source).toContain("lib/auto-mark-paid.js");
    expect(markPaidAt).toBeGreaterThan(-1);
    expect(findDueAt).toBeGreaterThan(markPaidAt);
  });

  it("keeps cron and manual auto-mark-paid runs on the shared idempotent helper", () => {
    for (const name of ["cron_subscriptions.pb.js", "routes_cron.pb.js"]) {
      const source = sourceOf(name);
      expect(source).toContain("lib/auto-mark-paid.js");
      expect(source).toContain("markDuePaymentsPaid");
    }

    const cronSource = sourceOf("cron_subscriptions.pb.js");
    expect(cronSource).toContain('cronAdd("updateNextPayment", "0 0 * * *"');
    expect(cronSource).toContain('cronAdd("autoMarkPaid", "5 0 * * *"');
  });

  it("is the only place that queries subscriptions for advancement", () => {
    // Catches a third caller appearing later and quietly rolling its own query.
    const offenders = files
      .filter((file) => /end_date\s*<\s*\{:today\}/.test(file.source))
      .map((file) => file.name);

    expect(offenders).toEqual([]);
  });

  it("renew feeds the record's own inactive flag back into the scheduler", () => {
    const source = sourceOf("routes_subscriptions.pb.js");
    const renewCall = source.slice(source.indexOf("/api/subscription/renew"));

    // Hardcoding `inactive: false` here made renew silently un-pause a
    // subscription the user had deliberately paused.
    expect(renewCall).toContain('inactive: sub.get("inactive")');
    expect(renewCall).not.toMatch(/inactive:\s*false/);
  });

  it("resolves the shared module from the path the hooks require", () => {
    // The hooks build this path at runtime from __hooks, so a rename would only
    // surface as a 500 in production without this check.
    expect(fs.existsSync(path.join(HOOKS_DIR, "lib/subscription-schedule.js"))).toBe(true);
    expect(fs.existsSync(path.join(HOOKS_DIR, "lib/auto-mark-paid.js"))).toBe(true);
  });
});
