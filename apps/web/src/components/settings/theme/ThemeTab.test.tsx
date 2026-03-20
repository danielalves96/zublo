import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

const mockAuthUser = vi.hoisted(() => ({
  user: { id: "user-1" } as Record<string, any>,
}));

vi.mock("@/components/settings/shared/useUserSettingsMutation", () => ({
  useUserSettingsMutation: () => ({ mutate }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockAuthUser.user }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/settings/theme/AccentColorSelector", () => ({
  AccentColorSelector: ({
    activeColor,
    onSelect,
  }: {
    activeColor: string;
    onSelect: (id: string) => void;
  }) => (
    <button
      data-testid="accent-select"
      data-active-color={activeColor}
      onClick={() => onSelect("red")}
    >
      accent
    </button>
  ),
}));

vi.mock("@/components/settings/theme/ThemeModeSelector", () => ({
  ThemeModeSelector: ({
    onSelect,
  }: {
    activeMode?: number;
    onSelect: (v: number) => void;
  }) => (
    <button data-testid="mode-select" onClick={() => onSelect(1)}>
      mode
    </button>
  ),
}));

import { DEFAULT_COLOR } from "@/lib/color-presets";

import { ThemeTab } from "./ThemeTab";

// ── Local localStorage stub ───────────────────────────────────────────────────

const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => localStorageStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    localStorageStore[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageStore[key];
  }),
  clear: vi.fn(() => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
  }),
};

vi.stubGlobal("localStorage", localStorageMock);

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ThemeTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser.user = { id: "user-1" };
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
    localStorageMock.getItem.mockImplementation(
      (key: string) => localStorageStore[key] ?? null,
    );
    document.getElementById("color-theme")?.remove();
  });

  it("uses user's color_theme as the initial active color", () => {
    mockAuthUser.user = { id: "user-1", color_theme: "violet" };
    render(<ThemeTab />);
    expect(
      screen.getByTestId("accent-select").getAttribute("data-active-color"),
    ).toBe("violet");
  });

  it("falls back to the localStorage color when user has no color_theme", () => {
    mockAuthUser.user = { id: "user-1", color_theme: undefined };
    localStorageMock.getItem.mockReturnValue("green");
    render(<ThemeTab />);
    expect(
      screen.getByTestId("accent-select").getAttribute("data-active-color"),
    ).toBe("green");
  });

  it("falls back to DEFAULT_COLOR when neither user nor localStorage provide a color", () => {
    mockAuthUser.user = { id: "user-1", color_theme: undefined };
    render(<ThemeTab />);
    expect(
      screen.getByTestId("accent-select").getAttribute("data-active-color"),
    ).toBe(DEFAULT_COLOR);
  });

  it("creates a new style element and calls mutate when no color-theme element exists", async () => {
    render(<ThemeTab />);
    await userEvent.click(screen.getByTestId("accent-select"));
    expect(document.getElementById("color-theme")).toBeInTheDocument();
    expect(mutate).toHaveBeenCalledWith({ color_theme: "red" });
  });

  it("reuses an existing color-theme style element instead of creating a new one", async () => {
    const existing = document.createElement("style");
    existing.id = "color-theme";
    document.head.appendChild(existing);

    render(<ThemeTab />);
    await userEvent.click(screen.getByTestId("accent-select"));

    expect(document.querySelectorAll("#color-theme").length).toBe(1);
    expect(mutate).toHaveBeenCalledWith({ color_theme: "red" });
  });

  it("calls mutate with the selected dark_theme_mode when the mode selector fires", async () => {
    render(<ThemeTab />);
    await userEvent.click(screen.getByTestId("mode-select"));
    expect(mutate).toHaveBeenCalledWith({ dark_theme_mode: 1 });
  });

  it("calls mutate with custom_css when the textarea loses focus", () => {
    render(<ThemeTab />);
    const textarea = screen.getByRole("textbox");
    fireEvent.blur(textarea);
    expect(mutate).toHaveBeenCalledWith({ custom_css: "" });
  });

  it("renders with user's existing custom_css as the textarea default value", () => {
    mockAuthUser.user = { id: "user-1", custom_css: "body { margin: 0; }" };
    render(<ThemeTab />);
    expect(screen.getByRole("textbox")).toHaveValue("body { margin: 0; }");
  });
});
