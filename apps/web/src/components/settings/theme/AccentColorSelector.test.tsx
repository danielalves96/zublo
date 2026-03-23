import { fireEvent, render, screen } from "@testing-library/react";

import { AccentColorSelector } from "./AccentColorSelector";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/lib/color-presets", () => ({
  COLOR_PRESETS: [
    { id: "blue", hex: "#3b82f6", label: "Blue" },
    { id: "red", hex: "#ef4444", label: "Red" },
  ],
}));

describe("AccentColorSelector", () => {
  it("renders label", () => {
    render(<AccentColorSelector activeColor="blue" onSelect={vi.fn()} />);
    expect(screen.getByText("accent_color")).toBeInTheDocument();
  });

  it("renders color preset buttons", () => {
    render(<AccentColorSelector activeColor="blue" onSelect={vi.fn()} />);
    expect(screen.getByTitle("Blue")).toBeInTheDocument();
    expect(screen.getByTitle("Red")).toBeInTheDocument();
  });

  it("calls onSelect when a color is clicked", () => {
    const onSelect = vi.fn();
    render(<AccentColorSelector activeColor="blue" onSelect={onSelect} />);
    fireEvent.click(screen.getByTitle("Red"));
    expect(onSelect).toHaveBeenCalledWith("red");
  });
});
