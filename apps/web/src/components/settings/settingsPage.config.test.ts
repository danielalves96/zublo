import { getSettingsPageMenuItems, SETTINGS_TAB_COMPONENTS, type SettingsTabKey } from "./settingsPage.config";

describe("settingsPage.config", () => {
  const expectedKeys: SettingsTabKey[] = [
    "profile", "2fa", "categories", "household", "currencies",
    "payment_methods", "display", "theme", "notifications",
    "ai", "api_key", "exchange_rates", "delete",
  ];

  it("SETTINGS_TAB_COMPONENTS has all expected keys", () => {
    for (const key of expectedKeys) {
      expect(SETTINGS_TAB_COMPONENTS[key]).toBeDefined();
    }
    expect(Object.keys(SETTINGS_TAB_COMPONENTS)).toHaveLength(expectedKeys.length);
  });

  it("getSettingsPageMenuItems returns items for all tabs", () => {
    const t = (k: string) => k;
    const items = getSettingsPageMenuItems(t as never);
    expect(items).toHaveLength(expectedKeys.length);
    const values = items.map((i) => i.value);
    for (const key of expectedKeys) {
      expect(values).toContain(key);
    }
  });

  it("delete tab is marked as danger", () => {
    const t = (k: string) => k;
    const items = getSettingsPageMenuItems(t as never);
    const deleteItem = items.find((i) => i.value === "delete");
    expect(deleteItem?.danger).toBe(true);
  });
});
