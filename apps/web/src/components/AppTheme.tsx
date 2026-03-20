import { useEffect } from "react";

import { useAuth } from "@/contexts/AuthContext";
import { buildColorCSS, getPreset, saveColorToStorage } from "@/lib/color-presets";

/** Applies user preferences: dark mode, color theme, custom CSS. Renders nothing. */
export function AppTheme() {
  const { user } = useAuth();

  useEffect(() => {
    const root = document.documentElement;
    const darkTheme = user?.dark_theme_mode;

    if (darkTheme === 1) {
      root.classList.add("dark");
    } else if (darkTheme === 0) {
      root.classList.remove("dark");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
    }

    // Color theme
    if (user?.color_theme) {
      saveColorToStorage(user.color_theme);
      const preset = getPreset(user.color_theme);
      let colorEl = document.getElementById("color-theme") as HTMLStyleElement | null;
      if (!colorEl) {
        colorEl = document.createElement("style");
        colorEl.id = "color-theme";
        document.head.appendChild(colorEl);
      }
      colorEl.textContent = buildColorCSS(preset);
    }

    // Custom CSS
    let styleEl = document.getElementById("custom-css") as HTMLStyleElement | null;
    if (user?.custom_css) {
      if (!styleEl) {
        styleEl = document.createElement("style");
        styleEl.id = "custom-css";
        document.head.appendChild(styleEl);
      }
      styleEl.textContent = user.custom_css;
    } else if (styleEl) {
      styleEl.textContent = "";
    }
  }, [user?.dark_theme_mode, user?.color_theme, user?.custom_css]);

  return null;
}
