import {
  API_KEY_PERMISSION_COLORS,
  API_KEY_PERMISSION_GROUPS,
  API_KEY_PERMISSIONS,
} from "@/components/settings/api-keys/config";

describe("api key config", () => {
  it("keeps permissions, groups, and colors in sync", () => {
    const groupIds = new Set(API_KEY_PERMISSION_GROUPS.map((group) => group.id));
    const permissionIds = API_KEY_PERMISSIONS.map((permission) => permission.id);

    expect(permissionIds).toHaveLength(12);
    expect(new Set(permissionIds).size).toBe(permissionIds.length);

    for (const permission of API_KEY_PERMISSIONS) {
      const groupId = permission.id.split(":")[0];

      expect(groupIds.has(groupId)).toBe(true);
      expect(API_KEY_PERMISSION_COLORS[permission.id].badge).toContain("text-");
      expect(permission.descKey).toContain("_desc");
    }
  });
});
