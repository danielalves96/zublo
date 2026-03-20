import { queryKeys } from "./queryKeys";

describe("queryKeys", () => {
  it("creates top-level keys", () => {
    expect(queryKeys.user()).toEqual(["user"]);
    expect(queryKeys.mainCurrency("user-1")).toEqual(["main-currency", "user-1"]);
    expect(queryKeys.cycles()).toEqual(["cycles"]);
    expect(queryKeys.dashboard("user-1")).toEqual(["dashboard", "user-1"]);
    expect(queryKeys.aiSettings("user-1")).toEqual(["ai_settings", "user-1"]);
    expect(queryKeys.notificationsConfig("user-1")).toEqual([
      "notifications_config",
      "user-1",
    ]);
    expect(queryKeys.apiKeys("user-1")).toEqual(["api-keys", "user-1"]);
  });

  it("creates user-scoped domain keys", () => {
    expect(queryKeys.subscriptions.all("user-1")).toEqual([
      "subscriptions",
      "user-1",
    ]);
    expect(queryKeys.currencies.all("user-1")).toEqual([
      "currencies",
      "user-1",
    ]);
    expect(queryKeys.categories.all("user-1")).toEqual([
      "categories",
      "user-1",
    ]);
    expect(queryKeys.paymentMethods.all("user-1")).toEqual([
      "payment_methods",
      "user-1",
    ]);
    expect(queryKeys.household.all("user-1")).toEqual([
      "household",
      "user-1",
    ]);
    expect(queryKeys.yearlyCosts.all("user-1")).toEqual([
      "yearly-costs",
      "user-1",
    ]);
    expect(queryKeys.aiRecommendations.all("user-1")).toEqual([
      "ai-recommendations",
      "user-1",
    ]);
  });

  it("creates month-scoped payment record keys", () => {
    expect(queryKeys.paymentRecords.all("user-1")).toEqual([
      "payment_records",
      "user-1",
    ]);
    expect(queryKeys.paymentRecords.forMonth("user-1", 2026, 3)).toEqual([
      "payment_records",
      "user-1",
      2026,
      3,
    ]);
  });

  it("creates admin keys", () => {
    expect(queryKeys.admin.users()).toEqual(["admin-users"]);
    expect(queryKeys.admin.settings()).toEqual(["admin-settings"]);
    expect(queryKeys.admin.smtp()).toEqual(["admin-smtp"]);
  });
});
