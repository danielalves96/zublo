/// <reference path="../pb_data/types.d.ts" />

/**
 * Zublo — Seed Data Migration
 *
 * Populates static lookup data:
 * - 4 cycles (Daily, Weekly, Monthly, Yearly)
 * - 29 frequencies linked to their respective cycles
 * - admin_settings singleton with defaults
 */

migrate(
  (app) => {
    // ================================================================
    // Seed Cycles
    // ================================================================
    const cyclesCol = app.findCollectionByNameOrId("cycles");
    const cycleNames = ["Daily", "Weekly", "Monthly", "Yearly"];
    const cycleIds = {};

    for (const name of cycleNames) {
      const record = new Record(cyclesCol);
      record.set("name", name);
      app.save(record);
      cycleIds[name] = record.id;
    }

    // ================================================================
    // Seed Frequencies
    // ================================================================
    const freqCol = app.findCollectionByNameOrId("frequencies");

    const frequencies = [
      // Daily
      { name: "Every day", value: 1, cycle: "Daily" },
      { name: "Every 2 days", value: 2, cycle: "Daily" },
      { name: "Every 3 days", value: 3, cycle: "Daily" },
      // Weekly
      { name: "Every week", value: 1, cycle: "Weekly" },
      { name: "Every 2 weeks", value: 2, cycle: "Weekly" },
      { name: "Every 3 weeks", value: 3, cycle: "Weekly" },
      { name: "Every 4 weeks", value: 4, cycle: "Weekly" },
      // Monthly
      { name: "Every month", value: 1, cycle: "Monthly" },
      { name: "Every 2 months", value: 2, cycle: "Monthly" },
      { name: "Every 3 months", value: 3, cycle: "Monthly" },
      { name: "Every 4 months", value: 4, cycle: "Monthly" },
      { name: "Every 5 months", value: 5, cycle: "Monthly" },
      { name: "Every 6 months", value: 6, cycle: "Monthly" },
      { name: "Every 7 months", value: 7, cycle: "Monthly" },
      { name: "Every 8 months", value: 8, cycle: "Monthly" },
      { name: "Every 9 months", value: 9, cycle: "Monthly" },
      { name: "Every 10 months", value: 10, cycle: "Monthly" },
      { name: "Every 11 months", value: 11, cycle: "Monthly" },
      { name: "Every 12 months", value: 12, cycle: "Monthly" },
      // Yearly
      { name: "Every year", value: 1, cycle: "Yearly" },
      { name: "Every 2 years", value: 2, cycle: "Yearly" },
      { name: "Every 3 years", value: 3, cycle: "Yearly" },
      { name: "Every 4 years", value: 4, cycle: "Yearly" },
      { name: "Every 5 years", value: 5, cycle: "Yearly" },
      { name: "Every 6 years", value: 6, cycle: "Yearly" },
      { name: "Every 7 years", value: 7, cycle: "Yearly" },
      { name: "Every 8 years", value: 8, cycle: "Yearly" },
      { name: "Every 9 years", value: 9, cycle: "Yearly" },
      { name: "Every 10 years", value: 10, cycle: "Yearly" },
    ];

    for (const freq of frequencies) {
      const record = new Record(freqCol);
      record.set("name", freq.name);
      record.set("value", freq.value);
      record.set("cycle", cycleIds[freq.cycle]);
      app.save(record);
    }

    // ================================================================
    // Seed Admin Settings (singleton)
    // ================================================================
    const adminCol = app.findCollectionByNameOrId("admin_settings");
    const settings = new Record(adminCol);
    settings.set("open_registrations", true);
    settings.set("disable_login", false);
    settings.set("update_notification", false);
    settings.set("latest_version", "1.0.0");
    settings.set("smtp_enabled", false);
    settings.set("smtp_port", 587);
    settings.set("smtp_encryption", "tls");
    app.save(settings);

    console.log("[Zublo] Seed data: 4 cycles, 29 frequencies, 1 admin_settings");
  },

  // DOWN
  (app) => {
    // Clear seed data (reverse order)
    try {
      const admin = app.findRecordsByFilter("admin_settings", "", "", 0, 0);
      for (const r of admin) app.delete(r);
    } catch (_) {}

    try {
      const freq = app.findRecordsByFilter("frequencies", "", "", 0, 0);
      for (const r of freq) app.delete(r);
    } catch (_) {}

    try {
      const cycles = app.findRecordsByFilter("cycles", "", "", 0, 0);
      for (const r of cycles) app.delete(r);
    } catch (_) {}
  }
);
