import { render, screen } from "@testing-library/react";
import * as React from "react";

import { Label } from "./label";

describe("Label", () => {
  it("renders a label element with children", () => {
    render(<Label>Field name</Label>);
    expect(screen.getByText("Field name")).toBeInTheDocument();
  });

  it("applies the htmlFor attribute", () => {
    render(<Label htmlFor="email-input">Email</Label>);
    expect(screen.getByText("Email")).toHaveAttribute("for", "email-input");
  });

  it("merges a custom className", () => {
    render(<Label className="custom-label">X</Label>);
    expect(screen.getByText("X")).toHaveClass("custom-label");
  });

  it("forwards ref to the label element", () => {
    const ref = React.createRef<HTMLLabelElement>();
    render(<Label ref={ref}>Ref label</Label>);
    expect(ref.current).toBeInstanceOf(HTMLLabelElement);
  });
});
