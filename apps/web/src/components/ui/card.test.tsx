import { render, screen } from "@testing-library/react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";

describe("Card components", () => {
  it("Card renders with rounded border and shadow", () => {
    const { container } = render(<Card>content</Card>);
    expect(container.firstChild).toHaveClass("rounded-lg", "border", "shadow-sm");
  });

  it("CardHeader renders with flex column layout and padding", () => {
    const { container } = render(<CardHeader>header</CardHeader>);
    expect(container.firstChild).toHaveClass("flex", "flex-col", "p-6");
  });

  it("CardTitle renders as an h3 with correct typography", () => {
    render(<CardTitle>My Title</CardTitle>);
    const heading = screen.getByRole("heading", { name: "My Title" });
    expect(heading).toHaveClass("text-2xl", "font-semibold");
  });

  it("CardDescription renders with muted text", () => {
    render(<CardDescription>Some description</CardDescription>);
    expect(screen.getByText("Some description")).toHaveClass(
      "text-muted-foreground",
    );
  });

  it("CardContent renders with padding offset", () => {
    const { container } = render(<CardContent>body</CardContent>);
    expect(container.firstChild).toHaveClass("p-6", "pt-0");
  });

  it("CardFooter renders with flex and padding offset", () => {
    const { container } = render(<CardFooter>footer</CardFooter>);
    expect(container.firstChild).toHaveClass("flex", "p-6", "pt-0");
  });

  it("each component merges a custom className", () => {
    const { container: c1 } = render(<Card className="c1">x</Card>);
    const { container: c2 } = render(<CardHeader className="c2">x</CardHeader>);
    const { container: c3 } = render(<CardContent className="c3">x</CardContent>);
    const { container: c4 } = render(<CardFooter className="c4">x</CardFooter>);
    expect(c1.firstChild).toHaveClass("c1");
    expect(c2.firstChild).toHaveClass("c2");
    expect(c3.firstChild).toHaveClass("c3");
    expect(c4.firstChild).toHaveClass("c4");
  });
});
