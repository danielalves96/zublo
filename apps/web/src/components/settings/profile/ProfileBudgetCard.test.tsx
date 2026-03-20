import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { ProfileBudgetCard } from "./ProfileBudgetCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/ui/currency-input", () => ({
  CurrencyInput: ({
    value,
    onChange,
    symbol,
    code,
  }: {
    value: number;
    onChange: (value: number) => void;
    symbol?: string;
    code?: string;
  }) => (
    <div>
      <span>{symbol}</span>
      <span>{code}</span>
      <input
        aria-label="budget-input"
        value={String(value)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  ),
}));

describe("ProfileBudgetCard", () => {
  it("renders the budget metadata and forwards changes", async () => {
    const onBudgetChange = vi.fn();

    render(
      <ProfileBudgetCard
        budget={150}
        symbol="R$"
        code="BRL"
        onBudgetChange={onBudgetChange}
      />,
    );

    expect(screen.getByText("monthly_budget")).toBeInTheDocument();
    expect(screen.getByText("budget_hint")).toBeInTheDocument();
    expect(screen.getByText("R$")).toBeInTheDocument();
    expect(screen.getByText("BRL")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("budget-input"), {
      target: { value: "320" },
    });

    expect(onBudgetChange).toHaveBeenLastCalledWith(320);
  });
});
