export interface ColorPreset {
  id: string;
  label: string;
  hex: string;
  /** HSL values for --primary in light mode */
  light: string;
  /** HSL values for --primary in dark mode */
  dark: string;
  /** Whether the primary-foreground should be dark (for bright colors like amber) */
  darkFg?: boolean;
}

export const DEFAULT_COLOR = "blue";

export const COLOR_PRESETS: ColorPreset[] = [
  // Blues
  { id: "navy",       label: "Navy",       hex: "#1d4ed8", light: "224 72% 46%",  dark: "224 72% 56%"  },
  { id: "blue",       label: "Blue",       hex: "#3b82f6", light: "217 91% 58%",  dark: "217 91% 64%"  },
  { id: "sky",        label: "Sky",        hex: "#0ea5e9", light: "199 89% 48%",  dark: "199 89% 56%"  },
  { id: "teal",       label: "Teal",       hex: "#14b8a6", light: "173 80% 38%",  dark: "173 76% 46%"  },
  // Purples
  { id: "indigo",     label: "Indigo",     hex: "#6366f1", light: "244 75% 59%",  dark: "244 80% 66%"  },
  { id: "violet",     label: "Violet",     hex: "#8b5cf6", light: "262 83% 58%",  dark: "262 85% 66%"  },
  { id: "lavender",   label: "Lavender",   hex: "#c084fc", light: "280 87% 72%",  dark: "280 87% 76%"  },
  { id: "fuchsia",    label: "Fuchsia",    hex: "#d946ef", light: "292 84% 61%",  dark: "292 86% 67%"  },
  // Pinks & reds
  { id: "pink",       label: "Pink",       hex: "#ec4899", light: "330 81% 58%",  dark: "330 81% 65%"  },
  { id: "rose",       label: "Rose",       hex: "#f43f5e", light: "347 77% 60%",  dark: "347 80% 66%"  },
  { id: "red",        label: "Red",        hex: "#ef4444", light: "0 84% 60%",    dark: "0 84% 66%"    },
  { id: "coral",      label: "Coral",      hex: "#fb923c", light: "20 96% 58%",   dark: "20 96% 64%",   darkFg: true },
  // Warm
  { id: "orange",     label: "Orange",     hex: "#f97316", light: "25 95% 53%",   dark: "25 95% 60%",   darkFg: true },
  { id: "amber",      label: "Amber",      hex: "#f59e0b", light: "45 93% 48%",   dark: "45 94% 56%",   darkFg: true },
  { id: "yellow",     label: "Yellow",     hex: "#eab308", light: "48 96% 45%",   dark: "48 96% 53%",   darkFg: true },
  { id: "gold",       label: "Gold",       hex: "#ca8a04", light: "43 89% 40%",   dark: "43 89% 50%",   darkFg: true },
  // Greens
  { id: "lime",       label: "Lime",       hex: "#84cc16", light: "85 85% 42%",   dark: "85 85% 50%",   darkFg: true },
  { id: "green",      label: "Green",      hex: "#22c55e", light: "142 71% 40%",  dark: "142 70% 48%"  },
  { id: "forest",     label: "Forest",     hex: "#15803d", light: "143 69% 30%",  dark: "143 69% 42%"  },
  { id: "emerald",    label: "Emerald",    hex: "#10b981", light: "160 84% 36%",  dark: "160 84% 44%"  },
  // Neutrals & earthy
  { id: "slate",      label: "Slate",      hex: "#64748b", light: "215 25% 47%",  dark: "215 25% 58%"  },
  { id: "copper",     label: "Copper",     hex: "#b45309", light: "28 73% 37%",   dark: "28 73% 48%"   },
  { id: "sage",       label: "Sage",       hex: "#6b8f71", light: "128 14% 48%",  dark: "128 14% 58%"  },
  { id: "midnight",   label: "Midnight",   hex: "#1e3a5f", light: "213 52% 25%",  dark: "213 52% 40%"  },
];

import { LS_KEYS } from "@/lib/constants";

const LS_KEY = LS_KEYS.COLOR_THEME;

export function getPreset(id: string | undefined): ColorPreset {
  return COLOR_PRESETS.find((p) => p.id === id) ?? COLOR_PRESETS[0];
}

export function saveColorToStorage(id: string) {
  localStorage.setItem(LS_KEY, id);
}

export function applyColorFromStorage() {
  const id = localStorage.getItem(LS_KEY) ?? DEFAULT_COLOR;
  const preset = getPreset(id);
  let el = document.getElementById("color-theme") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "color-theme";
    document.head.appendChild(el);
  }
  el.textContent = buildColorCSS(preset);
}

export function buildColorCSS(preset: ColorPreset): string {
  const fg = preset.darkFg ? "222.2 47.4% 11.2%" : "210 40% 98%";
  return `
    :root, :root.dark, html, html.dark {
      --primary: ${preset.light} !important;
      --primary-foreground: ${fg} !important;
      --ring: ${preset.light} !important;
    }
    html.dark, .dark {
      --primary: ${preset.dark} !important;
      --primary-foreground: ${fg} !important;
      --ring: ${preset.dark} !important;
    }
  `;
}
