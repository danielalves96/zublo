import {
  COLOR_PRESETS,
  DEFAULT_COLOR,
  applyColorFromStorage,
  buildColorCSS,
  getPreset,
  saveColorToStorage,
} from "./color-presets";
import { LS_KEYS } from "./constants";

function createStorageMock(): Storage {
  const store = new Map<string, string>();

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return Array.from(store.keys())[index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, String(value));
    },
  };
}

describe("color-presets", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createStorageMock());
    localStorage.clear();
    document.head.innerHTML = "";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns the requested preset when it exists", () => {
    expect(getPreset("emerald")).toMatchObject({
      id: "emerald",
      label: "Emerald",
    });
  });

  it("falls back to the first preset when the id is unknown", () => {
    expect(getPreset("missing")).toBe(COLOR_PRESETS[0]);
    expect(getPreset(undefined)).toBe(COLOR_PRESETS[0]);
  });

  it("saves the selected color to localStorage", () => {
    saveColorToStorage("violet");

    expect(localStorage.getItem(LS_KEYS.COLOR_THEME)).toBe("violet");
  });

  it("builds CSS using the dark foreground override for bright presets", () => {
    const css = buildColorCSS(getPreset("amber"));

    expect(css).toContain("--primary: 45 93% 48% !important;");
    expect(css).toContain("--primary: 45 94% 56% !important;");
    expect(css).toContain("--primary-foreground: 222.2 47.4% 11.2% !important;");
  });

  it("applies the saved preset by creating a style tag when needed", () => {
    localStorage.setItem(LS_KEYS.COLOR_THEME, "green");

    applyColorFromStorage();

    const style = document.getElementById("color-theme");
    expect(style).not.toBeNull();
    expect(style?.textContent).toContain(getPreset("green").light);
    expect(style?.textContent).toContain(getPreset("green").dark);
  });

  it("uses the default preset and updates the existing style tag", () => {
    const style = document.createElement("style");
    style.id = "color-theme";
    style.textContent = "old";
    document.head.appendChild(style);

    applyColorFromStorage();

    expect(document.querySelectorAll("#color-theme")).toHaveLength(1);
    expect(style.textContent).toContain(getPreset(DEFAULT_COLOR).light);
    expect(style.textContent).not.toBe("old");
  });
});
