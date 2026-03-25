import { fireEvent, render, screen } from "@testing-library/react";

import { OtpInput } from "./otp-input";

describe("OtpInput", () => {
  it("renders 6 inputs by default", () => {
    render(<OtpInput value="" onChange={() => {}} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(6);
  });

  it("renders a custom number of inputs via length prop", () => {
    render(<OtpInput value="" onChange={() => {}} length={4} />);
    expect(screen.getAllByRole("textbox")).toHaveLength(4);
  });

  it("distributes the value string across individual inputs", () => {
    render(<OtpInput value="123456" onChange={() => {}} />);
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    expect(inputs[0].value).toBe("1");
    expect(inputs[3].value).toBe("4");
    expect(inputs[5].value).toBe("6");
  });

  it("pads short values with empty strings for remaining slots", () => {
    render(<OtpInput value="12" onChange={() => {}} />);
    const inputs = screen.getAllByRole("textbox") as HTMLInputElement[];
    expect(inputs[2].value).toBe("");
    expect(inputs[5].value).toBe("");
  });

  it("applies border-primary/60 to filled slots and not to empty ones", () => {
    render(<OtpInput value="1" onChange={() => {}} />);
    const inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toHaveClass("border-primary/60");
    expect(inputs[1]).not.toHaveClass("border-primary/60");
  });

  it("calls onChange with the updated string when a digit is typed", () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith("5");
  });

  it("ignores non-digit characters", () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "a" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("disables all inputs when disabled prop is set", () => {
    render(<OtpInput value="" onChange={() => {}} disabled />);
    screen.getAllByRole("textbox").forEach((input) => {
      expect(input).toBeDisabled();
    });
  });

  it("merges a custom className on the wrapper div", () => {
    const { container } = render(
      <OtpInput value="" onChange={() => {}} className="my-otp" />,
    );
    expect(container.firstChild).toHaveClass("my-otp");
  });

  it("clears the current slot on Backspace when it has a value", () => {
    const onChange = vi.fn();
    render(<OtpInput value="123456" onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.keyDown(inputs[2], { key: "Backspace" });
    // slots[2]="3" is truthy → update(2, "") → ["1","2","","4","5","6"].join("") = "12456"
    expect(onChange).toHaveBeenCalledWith("12456");
  });

  it("clears the previous slot and focuses it on Backspace when current slot is empty", () => {
    const onChange = vi.fn();
    render(<OtpInput value="12" onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    // slot[2] is "" (empty), index > 0 → update(1, "") and focus(1)
    fireEvent.keyDown(inputs[2], { key: "Backspace" });
    expect(onChange).toHaveBeenCalledWith("1");
    expect(document.activeElement).toBe(inputs[1]);
  });

  it("does not move past first slot on Backspace when at index 0 with empty slot", () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.keyDown(inputs[0], { key: "Backspace" });
    // slot[0] is "", index === 0 → neither branch executes
    expect(onChange).not.toHaveBeenCalled();
  });

  it("moves focus to the previous slot on ArrowLeft", () => {
    render(<OtpInput value="" onChange={() => {}} />);
    const inputs = screen.getAllByRole("textbox");
    inputs[3].focus();
    fireEvent.keyDown(inputs[3], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(inputs[2]);
  });

  it("does not move focus before index 0 on ArrowLeft", () => {
    render(<OtpInput value="" onChange={() => {}} />);
    const inputs = screen.getAllByRole("textbox");
    inputs[0].focus();
    fireEvent.keyDown(inputs[0], { key: "ArrowLeft" });
    expect(document.activeElement).toBe(inputs[0]);
  });

  it("moves focus to the next slot on ArrowRight", () => {
    render(<OtpInput value="" onChange={() => {}} />);
    const inputs = screen.getAllByRole("textbox");
    inputs[2].focus();
    fireEvent.keyDown(inputs[2], { key: "ArrowRight" });
    expect(document.activeElement).toBe(inputs[3]);
  });

  it("does not move focus past the last slot on ArrowRight", () => {
    render(<OtpInput value="" onChange={() => {}} length={6} />);
    const inputs = screen.getAllByRole("textbox");
    inputs[5].focus();
    fireEvent.keyDown(inputs[5], { key: "ArrowRight" });
    expect(document.activeElement).toBe(inputs[5]);
  });

  it("does nothing on unrecognised key (covers false branch of else-if ArrowRight)", () => {
    const onChange = vi.fn();
    render(<OtpInput value="123456" onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    // A key that is none of Backspace / ArrowLeft / ArrowRight — all branches are false
    fireEvent.keyDown(inputs[2], { key: "Tab" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("fills all slots from pasted text and calls onChange", () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => "123456" },
    });
    expect(onChange).toHaveBeenCalledWith("123456");
  });

  it("fills only available slots when pasted text is shorter than length", () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => "12" },
    });
    // digits "12" → ["1","2","","","",""].join("") = "12"
    expect(onChange).toHaveBeenCalledWith("12");
  });

  it("strips non-digit characters from pasted text", () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => "1a2b3c" },
    });
    expect(onChange).toHaveBeenCalledWith("123");
  });

  it("ignores paste when clipboard contains no digits", () => {
    const onChange = vi.fn();
    render(<OtpInput value="" onChange={onChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.paste(inputs[0], {
      clipboardData: { getData: () => "abc" },
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("focuses the next slot after a digit is entered", () => {
    render(<OtpInput value="" onChange={() => {}} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "7" } });
    expect(document.activeElement).toBe(inputs[1]);
  });

  it("does not advance focus past the last slot after digit entry", () => {
    render(<OtpInput value="12345" onChange={() => {}} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[5], { target: { value: "6" } });
    // index === length - 1, no focus call → activeElement stays wherever it was
    expect(document.activeElement).not.toBe(inputs[6]);
  });
});
