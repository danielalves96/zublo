import { Monitor, Moon, Sun } from "lucide-react";

export const THEME_MODES = [
  { value: 0, labelKey: "light", icon: Sun },
  { value: 1, labelKey: "dark", icon: Moon },
  { value: 2, labelKey: "auto", icon: Monitor },
] as const;
