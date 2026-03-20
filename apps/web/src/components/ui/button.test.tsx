import { render, screen } from "@testing-library/react";

import { Button, buttonVariants } from "./button";

describe("Button", () => {
  it("renders as a button element by default", () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole("button", { name: "Click me" })).toBeInTheDocument();
  });

  it("applies default variant classes", () => {
    render(<Button>X</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-primary");
  });

  it("applies destructive variant", () => {
    render(<Button variant="destructive">X</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-destructive");
  });

  it("applies outline variant", () => {
    render(<Button variant="outline">X</Button>);
    expect(screen.getByRole("button")).toHaveClass("border", "border-input");
  });

  it("applies secondary variant", () => {
    render(<Button variant="secondary">X</Button>);
    expect(screen.getByRole("button")).toHaveClass("bg-secondary");
  });

  it("applies ghost variant", () => {
    render(<Button variant="ghost">X</Button>);
    expect(screen.getByRole("button")).toHaveClass("hover:bg-accent");
  });

  it("applies link variant", () => {
    render(<Button variant="link">X</Button>);
    expect(screen.getByRole("button")).toHaveClass("underline-offset-4");
  });

  it("applies sm size", () => {
    render(<Button size="sm">X</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-9");
  });

  it("applies lg size", () => {
    render(<Button size="lg">X</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-11");
  });

  it("applies icon size", () => {
    render(<Button size="icon">X</Button>);
    expect(screen.getByRole("button")).toHaveClass("h-10", "w-10");
  });

  it("is disabled when the disabled prop is set", () => {
    render(<Button disabled>X</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("renders as the child element when asChild is true", () => {
    render(
      <Button asChild>
        <a href="/test">Link</a>
      </Button>,
    );
    expect(screen.getByRole("link", { name: "Link" })).toBeInTheDocument();
  });

  it("merges a custom className", () => {
    render(<Button className="custom-btn">X</Button>);
    expect(screen.getByRole("button")).toHaveClass("custom-btn");
  });
});

describe("buttonVariants", () => {
  it("returns default variant classes", () => {
    expect(buttonVariants()).toContain("bg-primary");
  });

  it("returns destructive variant classes", () => {
    expect(buttonVariants({ variant: "destructive" })).toContain("bg-destructive");
  });

  it("returns outline variant classes", () => {
    expect(buttonVariants({ variant: "outline" })).toContain("border-input");
  });

  it("returns secondary variant classes", () => {
    expect(buttonVariants({ variant: "secondary" })).toContain("bg-secondary");
  });

  it("returns ghost variant classes", () => {
    expect(buttonVariants({ variant: "ghost" })).toContain("hover:bg-accent");
  });

  it("returns link variant classes", () => {
    expect(buttonVariants({ variant: "link" })).toContain("underline-offset-4");
  });

  it("returns sm size classes", () => {
    expect(buttonVariants({ size: "sm" })).toContain("h-9");
  });

  it("returns lg size classes", () => {
    expect(buttonVariants({ size: "lg" })).toContain("h-11");
  });

  it("returns icon size classes", () => {
    expect(buttonVariants({ size: "icon" })).toContain("h-10");
  });
});
