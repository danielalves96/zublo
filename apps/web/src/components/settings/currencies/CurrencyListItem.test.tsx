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

  it("does not call onSetMain when star clicked for main currency", () => {
    const onSetMain = vi.fn();
    const mainCurrency = { ...baseCurrency, is_main: true };
    render(<CurrencyListItem currency={mainCurrency} onDelete={vi.fn()} onEdit={vi.fn()} onSetMain={onSetMain} />);
    fireEvent.click(screen.getByTitle("Main Currency"));
    expect(onSetMain).not.toHaveBeenCalled();
  });

  it("does not render name when name is empty", () => {
    const currencyNoName = { ...baseCurrency, name: "" };
    render(<CurrencyListItem currency={currencyNoName} onDelete={vi.fn()} onEdit={vi.fn()} onSetMain={vi.fn()} />);
    // Only code and symbol should be rendered, not an extra name span
    expect(screen.queryByText("Dollar")).not.toBeInTheDocument();
  });

  it("applies main currency styles when is_main is true", () => {
    const mainCurrency = { ...baseCurrency, is_main: true };
    render(<CurrencyListItem currency={mainCurrency} onDelete={vi.fn()} onEdit={vi.fn()} onSetMain={vi.fn()} />);
    // Main currency does not render edit/delete buttons
    const buttons = screen.queryAllByRole("button");
    // The star button should be present but not edit/delete
    expect(buttons).toHaveLength(1); // only the star button
  });

  it("calls onEdit when edit button clicked for non-main currency", () => {
    const onEdit = vi.fn();
    render(<CurrencyListItem currency={baseCurrency} onDelete={vi.fn()} onEdit={onEdit} onSetMain={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button (after star button)
    expect(onEdit).toHaveBeenCalled();
  });

  it("calls onDelete when delete button clicked for non-main currency", () => {
    const onDelete = vi.fn();
    render(<CurrencyListItem currency={baseCurrency} onDelete={onDelete} onEdit={vi.fn()} onSetMain={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // delete button
    expect(onDelete).toHaveBeenCalled();
  });
});
