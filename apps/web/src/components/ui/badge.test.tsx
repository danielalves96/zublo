import { render } from "@testing-library/react";

import { Badge } from "./badge";

describe("Badge", () => {
  it("renders children with default variant classes", () => {
    const { container } = render(<Badge>New</Badge>);
    expect(container.firstChild).toHaveTextContent("New");
    expect(container.firstChild).toHaveClass("bg-primary");
  });

  it("applies secondary variant", () => {
    const { container } = render(<Badge variant="secondary">Beta</Badge>);
    expect(container.firstChild).toHaveClass("bg-secondary");
  });

  it("applies outline variant", () => {
    const { container } = render(<Badge variant="outline">Draft</Badge>);
    expect(container.firstChild).toHaveClass("text-foreground");
  });

  it("applies destructive variant", () => {
    const { container } = render(<Badge variant="destructive">Error</Badge>);
    expect(container.firstChild).toHaveClass("bg-destructive");
  });

  it("merges a custom className", () => {
    const { container } = render(<Badge className="extra">X</Badge>);
    expect(container.firstChild).toHaveClass("extra");
  });

  it("renders as a span element", () => {
    const { container } = render(<Badge>Tag</Badge>);
    expect(container.firstChild?.nodeName).toBe("SPAN");
  });
});
