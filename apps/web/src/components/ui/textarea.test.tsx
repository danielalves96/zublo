import { render, screen } from "@testing-library/react";
import * as React from "react";

import { Textarea } from "./textarea";

describe("Textarea", () => {
  it("renders a textarea element", () => {
    render(<Textarea />);
    expect(screen.getByRole("textbox")).toBeInTheDocument();
  });

  it("renders the placeholder", () => {
    render(<Textarea placeholder="Write here…" />);
    expect(screen.getByPlaceholderText("Write here…")).toBeInTheDocument();
  });

  it("is disabled when the disabled prop is set", () => {
    render(<Textarea disabled />);
    expect(screen.getByRole("textbox")).toBeDisabled();
  });

  it("merges a custom className", () => {
    render(<Textarea className="custom-ta" />);
    expect(screen.getByRole("textbox")).toHaveClass("custom-ta");
  });

  it("forwards ref to the underlying textarea element", () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });
});
