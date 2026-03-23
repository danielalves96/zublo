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
});
