import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

import { CurrencyInput } from "./currency-input";

describe("CurrencyInput", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows a formatted value when not focused and value > 0", () => {
    render(<CurrencyInput value={10} onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    // formatNumber(10) → non-empty, e.g. "10.00"
    expect(input.getAttribute("value")).not.toBe("");
    expect(input.getAttribute("value")).toMatch(/10/);
  });

  it("shows an empty value when the numeric value is 0", () => {
    render(<CurrencyInput value={0} onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("accepts a string value and converts it to numeric", () => {
    render(<CurrencyInput value="25.5" onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("value")).toMatch(/25/);
  });

  it("shows the symbol prefix when symbol prop is provided", () => {
    render(<CurrencyInput value={0} onChange={() => {}} symbol="$" />);
    expect(screen.getByText("$")).toBeInTheDocument();
  });

  it("shows the currency code suffix when code prop is provided", () => {
    render(<CurrencyInput value={0} onChange={() => {}} code="USD" />);
    expect(screen.getByText("USD")).toBeInTheDocument();
  });

  it("renders without symbol or code when they are absent", () => {
    const { container } = render(<CurrencyInput value={0} onChange={() => {}} />);
    expect(container.querySelectorAll("span")).toHaveLength(0);
  });

  it("applies disabled styling when the disabled prop is set", () => {
    const { container } = render(
      <CurrencyInput value={0} onChange={() => {}} disabled />,
    );
    expect(container.firstChild).toHaveClass("opacity-50");
  });

  it("shows raw numeric string on focus", () => {
    render(<CurrencyInput value={10} onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    vi.runAllTimers();
    expect(input).toHaveValue("10");
  });

  it("calls onChange with 0 on blur when the input is cleared", () => {
    const onChange = vi.fn();
    // Fully controlled wrapper to keep value in sync with onChange
    function ControlledInput() {
      const [val, setVal] = React.useState<number>(10);
      return (
        <CurrencyInput
          value={val}
          onChange={(v) => {
            setVal(v);
            onChange(v);
          }}
        />
      );
    }
    render(<ControlledInput />);
    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    vi.runAllTimers();
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(0);
    // After blur with value=0, the formatted display is empty
    expect(input).toHaveValue("");
  });

  it("calls onChange with the parsed float on blur after typing", () => {
    const onChange = vi.fn();
    // Fully controlled wrapper to keep value in sync with onChange
    function ControlledInput() {
      const [val, setVal] = React.useState<number>(0);
      return (
        <CurrencyInput
          value={val}
          onChange={(v) => {
            setVal(v);
            onChange(v);
          }}
        />
      );
    }
    render(<ControlledInput />);
    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    vi.runAllTimers();
    fireEvent.change(input, { target: { value: "19.99" } });
    fireEvent.blur(input);
    expect(onChange).toHaveBeenCalledWith(19.99);
    // After blur the raw stays "19.99" because focused=false and formatNumber(19.99) is shown
    expect(input.getAttribute("value")).toMatch(/19\.99|19,99/);
  });

  it("calls onChange on every change event with the current parsed value", () => {
    const onChange = vi.fn();
    render(<CurrencyInput value={0} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it("parses comma as decimal separator", () => {
    const onChange = vi.fn();
    render(<CurrencyInput value={0} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    fireEvent.change(input, { target: { value: "10,5" } });
    expect(onChange).toHaveBeenCalledWith(10.5);
  });

  it("strips thousands separators when both dot and comma are present", () => {
    const onChange = vi.fn();
    render(<CurrencyInput value={0} onChange={onChange} />);
    const input = screen.getByRole("textbox");
    // "1.000,50" → last separator is comma → 1000.50
    fireEvent.change(input, { target: { value: "1.000,50" } });
    expect(onChange).toHaveBeenCalledWith(1000.5);
  });

  it("syncs raw value when external value changes while not focused", () => {
    const { rerender } = render(<CurrencyInput value={10} onChange={() => {}} />);
    rerender(<CurrencyInput value={20} onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    expect(input.getAttribute("value")).toMatch(/20/);
  });

  it("does not update the raw value while the input is focused", () => {
    const { rerender } = render(<CurrencyInput value={10} onChange={() => {}} />);
    const input = screen.getByRole("textbox");
    fireEvent.focus(input);
    vi.runAllTimers();
    // Shows raw "10" while focused
    expect(input).toHaveValue("10");
    // External value changes while focused
    rerender(<CurrencyInput value={20} onChange={() => {}} />);
    // Raw stays at "10" (useEffect skipped because !focused is false)
    expect(input).toHaveValue("10");
  });

  it("renders the placeholder when provided", () => {
    render(
      <CurrencyInput value={0} onChange={() => {}} placeholder="0.00" />,
    );
    expect(screen.getByPlaceholderText("0.00")).toBeInTheDocument();
  });

  it("treats a non-numeric string value as 0 and shows empty display", () => {
    // typeof value === "string" → parseFloat("abc") = NaN → || 0 → numeric = 0
    render(<CurrencyInput value="abc" onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });

  it("treats string '0' as 0 and shows empty display", () => {
    // typeof value === "string" → parseFloat("0") = 0 → || 0 keeps 0 → numeric = 0
    render(<CurrencyInput value="0" onChange={() => {}} />);
    expect(screen.getByRole("textbox")).toHaveValue("");
  });
});
