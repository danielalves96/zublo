import { render } from "@testing-library/react";

// Mock color-presets utilities
const mockSaveColorToStorage = vi.fn();
const mockGetPreset = vi.fn().mockReturnValue({ primary: "#000" });
const mockBuildColorCSS = vi.fn().mockReturnValue(":root { --primary: #000; }");

vi.mock("@/lib/color-presets", () => ({
  saveColorToStorage: (...args: unknown[]) => mockSaveColorToStorage(...args),
  getPreset: (...args: unknown[]) => mockGetPreset(...args),
  buildColorCSS: (...args: unknown[]) => mockBuildColorCSS(...args),
}));

// Mock AuthContext
const mockUseAuth = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

import { AppTheme } from "./AppTheme";

// Helper to build a partial User for the mock
function makeUser(overrides: Record<string, unknown> = {}) {
  return { dark_theme_mode: undefined, color_theme: undefined, custom_css: undefined, ...overrides };
}

describe("AppTheme", () => {
  beforeEach(() => {
    // Stub window.matchMedia for all tests
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: false }),
    });
    // Clean up DOM side-effects
    document.documentElement.classList.remove("dark");
    document.getElementById("color-theme")?.remove();
    document.getElementById("custom-css")?.remove();
    mockSaveColorToStorage.mockClear();
    mockGetPreset.mockClear();
    mockBuildColorCSS.mockClear();
  });

  it("renders null", () => {
    mockUseAuth.mockReturnValue({ user: null });
    const { container } = render(<AppTheme />);
    expect(container.firstChild).toBeNull();
  });

  it("adds dark class when dark_theme_mode is 1", () => {
    mockUseAuth.mockReturnValue({ user: makeUser({ dark_theme_mode: 1 }) });
    render(<AppTheme />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("removes dark class when dark_theme_mode is 0", () => {
    document.documentElement.classList.add("dark");
    mockUseAuth.mockReturnValue({ user: makeUser({ dark_theme_mode: 0 }) });
    render(<AppTheme />);
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("uses system preference when dark_theme_mode is undefined and prefers dark", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockReturnValue({ matches: true }),
    });
    mockUseAuth.mockReturnValue({ user: makeUser({ dark_theme_mode: undefined }) });
    render(<AppTheme />);
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("applies color theme when user has color_theme", () => {
    mockUseAuth.mockReturnValue({ user: makeUser({ color_theme: "blue" }) });
    render(<AppTheme />);
    expect(mockSaveColorToStorage).toHaveBeenCalledWith("blue");
    expect(mockGetPreset).toHaveBeenCalledWith("blue");
    const el = document.getElementById("color-theme") as HTMLStyleElement;
    expect(el).not.toBeNull();
    expect(el.textContent).toBe(":root { --primary: #000; }");
  });

  it("applies custom CSS when user has custom_css", () => {
    mockUseAuth.mockReturnValue({ user: makeUser({ custom_css: "body { background: red; }" }) });
    render(<AppTheme />);
    const el = document.getElementById("custom-css") as HTMLStyleElement;
    expect(el).not.toBeNull();
    expect(el.textContent).toBe("body { background: red; }");
  });

  it("clears custom CSS element when custom_css is falsy and element exists", () => {
    // Pre-create the element
    const styleEl = document.createElement("style");
    styleEl.id = "custom-css";
    styleEl.textContent = "old-content";
    document.head.appendChild(styleEl);

    mockUseAuth.mockReturnValue({ user: makeUser({ custom_css: "" }) });
    render(<AppTheme />);
    expect(document.getElementById("custom-css")?.textContent).toBe("");
  });
});
