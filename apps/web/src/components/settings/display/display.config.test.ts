import { DISPLAY_TOGGLES } from "@/components/settings/display/display.config";

describe("display.config", () => {
  it("defines unique toggles with label and description keys", () => {
    const keys = DISPLAY_TOGGLES.map((toggle) => toggle.key);

    expect(keys).toHaveLength(8);
    expect(new Set(keys).size).toBe(keys.length);

    for (const toggle of DISPLAY_TOGGLES) {
      expect(toggle.labelKey).toBeTruthy();
      expect(toggle.descriptionKey).toContain("_desc");
    }
  });
});
