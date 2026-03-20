import { render, screen } from "@testing-library/react";

import { Progress } from "./progress";

describe("Progress", () => {
  it("renders a progressbar element", () => {
    render(<Progress value={50} />);
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("sets the indicator transform based on the value", () => {
    const { container } = render(<Progress value={70} />);
    const indicator = container.querySelector("[style]") as HTMLElement;
    expect(indicator.style.transform).toBe("translateX(-30%)");
  });

  it("uses 100% offset when value is 0", () => {
    const { container } = render(<Progress value={0} />);
    const indicator = container.querySelector("[style]") as HTMLElement;
    expect(indicator.style.transform).toBe("translateX(-100%)");
  });

  it("uses 100% offset when value is undefined", () => {
    const { container } = render(<Progress />);
    const indicator = container.querySelector("[style]") as HTMLElement;
    expect(indicator.style.transform).toBe("translateX(-100%)");
  });

  it("uses 0% offset when value is 100", () => {
    const { container } = render(<Progress value={100} />);
    const indicator = container.querySelector("[style]") as HTMLElement;
    expect(indicator.style.transform).toBe("translateX(-0%)");
  });

  it("merges a custom className", () => {
    const { container } = render(<Progress value={50} className="custom-bar" />);
    expect(container.firstChild).toHaveClass("custom-bar");
  });
});
