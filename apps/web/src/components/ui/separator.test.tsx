import { render } from "@testing-library/react";

import { Separator } from "./separator";

describe("Separator", () => {
  it("renders a horizontal separator by default", () => {
    const { container } = render(<Separator />);
    expect(container.firstChild).toHaveClass("h-[1px]", "w-full");
  });

  it("renders a vertical separator when orientation is vertical", () => {
    const { container } = render(<Separator orientation="vertical" />);
    expect(container.firstChild).toHaveClass("h-full", "w-[1px]");
  });

  it("merges a custom className", () => {
    const { container } = render(<Separator className="my-divider" />);
    expect(container.firstChild).toHaveClass("my-divider");
  });
});
