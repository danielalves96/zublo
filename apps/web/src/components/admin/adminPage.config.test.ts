import { ADMIN_TAB_COMPONENTS, getAdminPageMenuItems, type AdminTabKey } from "./adminPage.config";

describe("adminPage.config", () => {
  const expectedKeys: AdminTabKey[] = [
    "users", "registration", "smtp", "oidc", "backup", "cronjobs", "maintenance",
  ];

  it("ADMIN_TAB_COMPONENTS has all expected keys", () => {
    for (const key of expectedKeys) {
      expect(ADMIN_TAB_COMPONENTS[key]).toBeDefined();
    }
    expect(Object.keys(ADMIN_TAB_COMPONENTS)).toHaveLength(expectedKeys.length);
  });

  it("getAdminPageMenuItems returns items for all tabs", () => {
    const t = (k: string) => k;
    const items = getAdminPageMenuItems(t as never);
    expect(items).toHaveLength(expectedKeys.length);
    const values = items.map((i) => i.value);
    for (const key of expectedKeys) {
      expect(values).toContain(key);
    }
  });

  it("each menu item has a label and icon", () => {
    const t = (k: string) => k;
    const items = getAdminPageMenuItems(t as never);
    for (const item of items) {
      expect(item.label).toBeTruthy();
      expect(item.icon).toBeDefined();
    }
  });
});
