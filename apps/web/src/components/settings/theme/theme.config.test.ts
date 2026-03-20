import { Monitor, Moon, Sun } from "lucide-react";

import { THEME_MODES } from "@/components/settings/theme/theme.config";

describe("theme.config", () => {
  it("defines the supported theme modes in display order", () => {
    expect(THEME_MODES).toEqual([
      { value: 0, labelKey: "light", icon: Sun },
      { value: 1, labelKey: "dark", icon: Moon },
      { value: 2, labelKey: "auto", icon: Monitor },
    ]);
  });
});
