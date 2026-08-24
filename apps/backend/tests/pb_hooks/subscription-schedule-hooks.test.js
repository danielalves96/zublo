const { hookFiles } = require("./helpers/hook-source.js");

/**
 * Static guards for the two hooks that advance subscription schedules.
 *
 * Both bugs these cover are invisible until a real PocketBase runs them, and
 * the binary is deliberately not checked in (see INTEGRATION_TESTING.md), so
 * the integration suite is skipped on a clean checkout. Asserting on the source
 * is what keeps the regression from silently coming back in the meantime, the
 * same tradeoff hook-callback-scope.test.js already makes.
 */
const files = hookFiles();
const sourceOf = (name) => {
  const file = files.find((candidate) => candidate.name === name);
  if (!file) throw new Error("missing hook file: " + name);
  return file.source;
};

const SCHEDULE_ADVANCERS = ["cron_subscriptions.pb.js", "routes_cron.pb.js"];

describe("subscription schedule hooks", () => {
  it.each(SCHEDULE_ADVANCERS)(
    "%s guards the end_date filter against unset dates",
    (name) => {
      const source = sourceOf(name);

      // An unset PocketBase date field is the empty string, and date filters are
      // string comparisons, so a bare `end_date < :today` matches every record
      // that has no end date at all — turning a due-only job into a full-table
      // rewrite. cron_subscriptions.pb.js already uses this idiom for
      // cancellation_date; both advancers must use it for end_date.
      const guarded = "end_date != '' && end_date < {:today}";
      expect(source).toContain(guarded);

      // Drop the guarded form, then assert nothing unguarded is left over.
      const remainder = source.split(guarded).join("");
      expect(remainder.match(/end_date\s*<\s*\{:today\}/g)).toBe(null);
    },
  );

  it.each(SCHEDULE_ADVANCERS)(
    "%s advances through advanceFiniteSchedule instead of an unbounded loop",
    (name) => {
      const source = sourceOf(name);

      // The unbounded `while (nextPayment <= today) advanceDate(...)` loop walks
      // straight past end_date and payment_limit without ever counting a payment
      // or deactivating the record, which desyncs payments_completed from
      // next_payment for good.
      expect(source).toContain("advanceFiniteSchedule");
      expect(source).not.toMatch(/while\s*\(\s*nextPayment\s*<=\s*today\s*\)/);
    },
  );

  it("renew feeds the record's own inactive flag back into the scheduler", () => {
    const source = sourceOf("routes_subscriptions.pb.js");
    const renewCall = source.slice(source.indexOf("/api/subscription/renew"));

    // Hardcoding `inactive: false` here made renew silently un-pause a
    // subscription the user had deliberately paused.
    expect(renewCall).toContain('inactive: sub.get("inactive")');
    expect(renewCall).not.toMatch(/inactive:\s*false/);
  });
});
