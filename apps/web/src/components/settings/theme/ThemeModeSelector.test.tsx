import { fireEvent, render, screen } from "@testing-library/react";

import { ThemeModeSelector } from "./ThemeModeSelector";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/components/settings/theme/theme.config", () => ({
  THEME_MODES: [
    { value: 0, labelKey: "light", icon: () => <span>LightIcon</span> },
    { value: 1, labelKey: "dark", icon: () => <span>DarkIcon</span> },
    { value: 2, labelKey: "system", icon: () => <span>SystemIcon</span> },
  ],
}));

describe("ThemeModeSelector", () => {
  it("renders color scheme label", () => {
    render(<ThemeModeSelector activeMode={0} onSelect={vi.fn()} />);
    expect(screen.getByText("color_scheme")).toBeInTheDocument();
  });

  it("renders all mode buttons", () => {
    render(<ThemeModeSelector activeMode={0} onSelect={vi.fn()} />);
    expect(screen.getByText("light")).toBeInTheDocument();
    expect(screen.getByText("dark")).toBeInTheDocument();
    expect(screen.getByText("system")).toBeInTheDocument();
  });

  it("calls onSelect with mode value", () => {
    const onSelect = vi.fn();
    render(<ThemeModeSelector activeMode={0} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("dark"));
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
