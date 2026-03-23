import { render, screen } from "@testing-library/react";

import { CalendarOverview } from "./CalendarOverview";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/components/calendar/StatCard", () => ({
  StatCard: ({ label, value }: { label: string; value: string }) => (
    <div data-testid={`stat-${label}`}>{value}</div>
  ),
}));

vi.mock("@/lib/utils", () => ({
  formatPrice: (v: number, s: string) => `${s}${v.toFixed(2)}`,
}));

describe("CalendarOverview", () => {
  const baseProps = {
    count: 5,
    total: 100,
    due: 30,
    loading: false,
    budget: 200,
    overBudget: false,
    mainCurrency: { id: "1", name: "Dollar", code: "USD", symbol: "$", rate: 1, is_main: true, user: "u1" },
  };

  it("renders 3 stat cards", () => {
    render(<CalendarOverview {...baseProps} />);
    expect(screen.getByTestId("stat-subscriptions")).toHaveTextContent("5");
    expect(screen.getByTestId("stat-total")).toHaveTextContent("$100.00");
    expect(screen.getByTestId("stat-due")).toHaveTextContent("$30.00");
  });

  it("shows over budget warning when overBudget is true", () => {
    render(<CalendarOverview {...baseProps} overBudget total={250} budget={200} />);
    expect(screen.getByText("over_budget_warning")).toBeInTheDocument();
  });

  it("does not show warning when overBudget is false", () => {
    render(<CalendarOverview {...baseProps} overBudget={false} />);
    expect(screen.queryByText("over_budget_warning")).not.toBeInTheDocument();
  });

  it("uses $ as default currency symbol when mainCurrency is undefined", () => {
    render(<CalendarOverview {...baseProps} mainCurrency={undefined} />);
    expect(screen.getByTestId("stat-total")).toHaveTextContent("$100.00");
  });
});
