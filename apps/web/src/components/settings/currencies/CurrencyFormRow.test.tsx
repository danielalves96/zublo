import { fireEvent, render, screen } from "@testing-library/react";

import { CurrencyFormRow } from "./CurrencyFormRow";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("CurrencyFormRow", () => {
  const defaults = {
    code: "USD",
    symbol: "$",
    name: "Dollar",
    onCodeChange: vi.fn(),
    onSymbolChange: vi.fn(),
    onNameChange: vi.fn(),
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  };

  it("renders all three input values", () => {
    render(<CurrencyFormRow {...defaults} />);
    expect(screen.getByDisplayValue("USD")).toBeInTheDocument();
    expect(screen.getByDisplayValue("$")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Dollar")).toBeInTheDocument();
  });

  it("calls onSubmit when check button clicked", () => {
    const onSubmit = vi.fn();
    render(<CurrencyFormRow {...defaults} onSubmit={onSubmit} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(onSubmit).toHaveBeenCalled();
  });

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    render(<CurrencyFormRow {...defaults} onCancel={onCancel} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onCodeChange when code input changes", () => {
    const onCodeChange = vi.fn();
    render(<CurrencyFormRow {...defaults} onCodeChange={onCodeChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "EUR" } });
    expect(onCodeChange).toHaveBeenCalledWith("EUR");
  });

  it("calls onSymbolChange when symbol input changes", () => {
    const onSymbolChange = vi.fn();
    render(<CurrencyFormRow {...defaults} onSymbolChange={onSymbolChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[1], { target: { value: "€" } });
    expect(onSymbolChange).toHaveBeenCalledWith("€");
  });

  it("calls onNameChange when name input changes", () => {
    const onNameChange = vi.fn();
    render(<CurrencyFormRow {...defaults} onNameChange={onNameChange} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[2], { target: { value: "Euro" } });
    expect(onNameChange).toHaveBeenCalledWith("Euro");
  });

  it("calls onSubmit when Enter key pressed in name input", () => {
    const onSubmit = vi.fn();
    render(<CurrencyFormRow {...defaults} onSubmit={onSubmit} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.keyDown(inputs[2], { key: "Enter" });
    expect(onSubmit).toHaveBeenCalled();
  });

  it("does not call onSubmit on non-Enter key in name input", () => {
    const onSubmit = vi.fn();
    render(<CurrencyFormRow {...defaults} onSubmit={onSubmit} />);
    const inputs = screen.getAllByRole("textbox");
    fireEvent.keyDown(inputs[2], { key: "Escape" });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
