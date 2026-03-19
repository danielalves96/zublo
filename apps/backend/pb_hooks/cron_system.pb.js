/// <reference path="../pb_data/types.d.ts" />

// ================================================================
// CRON 6: Check for Updates
// ================================================================
cronAdd("checkForUpdates", "0 0 * * 0", () => {
  try {
    const adminRecords = $app.findRecordsByFilter("admin_settings", "", "", 1, 0);
    if (adminRecords.length === 0) return;

    const admin = adminRecords[0];
    if (!admin.get("update_notification")) return;

    const res = $http.send({
      url: "https://api.github.com/repos/danielalves96/zublo/releases/latest",
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
