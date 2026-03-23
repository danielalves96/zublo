import { fireEvent, render, screen } from "@testing-library/react";

import type { Currency } from "@/types";

import { CurrencyListItem } from "./CurrencyListItem";

describe("CurrencyListItem", () => {
  const baseCurrency: Currency = {
    id: "c1",
    code: "USD",
    symbol: "$",
    name: "Dollar",
    is_main: false,
    user: "u1",
  } as Currency;

  it("renders currency code and symbol", () => {
    render(<CurrencyListItem currency={baseCurrency} onDelete={vi.fn()} onEdit={vi.fn()} onSetMain={vi.fn()} />);
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("$")).toBeInTheDocument();
  });

  it("renders currency name when provided", () => {
    render(<CurrencyListItem currency={baseCurrency} onDelete={vi.fn()} onEdit={vi.fn()} onSetMain={vi.fn()} />);
    expect(screen.getByText("Dollar")).toBeInTheDocument();
  });

  it("calls onSetMain when star clicked for non-main currency", () => {
    const onSetMain = vi.fn();
    render(<CurrencyListItem currency={baseCurrency} onDelete={vi.fn()} onEdit={vi.fn()} onSetMain={onSetMain} />);
    fireEvent.click(screen.getByTitle("Set as Main"));
    expect(onSetMain).toHaveBeenCalled();
  });
});
