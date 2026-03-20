import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Switch } from "./switch";

describe("Switch", () => {
  it("renders a switch role element", () => {
    render(<Switch />);
    expect(screen.getByRole("switch")).toBeInTheDocument();
  });

  it("is unchecked by default", () => {
    render(<Switch />);
    expect(screen.getByRole("switch")).not.toBeChecked();
  });

  it("is checked when checked prop is true", () => {
    render(<Switch checked onChange={() => {}} />);
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("is disabled when the disabled prop is set", () => {
    render(<Switch disabled />);
    expect(screen.getByRole("switch")).toBeDisabled();
  });

  it("calls onCheckedChange with true when toggled on", async () => {
    const onCheckedChange = vi.fn();
    render(<Switch onCheckedChange={onCheckedChange} />);
    await userEvent.click(screen.getByRole("switch"));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("merges a custom className", () => {
    render(<Switch className="custom-switch" />);
    expect(screen.getByRole("switch")).toHaveClass("custom-switch");
  });
});
