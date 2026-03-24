import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { CalendarOverview } from "./CalendarOverview";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/components/calendar/StatCard", () => ({
  StatCard: ({ label, value, loading }: any) => (
    <div data-testid={`stat-${label}`}>
      {loading ? "loading" : value}
    </div>
  ),
}));

describe("CalendarOverview", () => {
  const defaultProps = {
    count: 10,
    total: 100,
    due: 50,
    loading: false,
    budget: 150,
    overBudget: false,
  };

  it("renders with default props and no main currency", () => {
    render(<CalendarOverview {...defaultProps} />);

    expect(screen.getByTestId("stat-subscriptions")).toHaveTextContent("10");
    expect(screen.getByTestId("stat-total")).toHaveTextContent("100.00 $");
    expect(screen.getByTestId("stat-due")).toHaveTextContent("50.00 $");
    expect(screen.queryByText("over_budget_warning")).not.toBeInTheDocument();
  });

  it("renders with main currency and over budget warning", () => {
    render(
      <CalendarOverview
        {...defaultProps}
        due={60}
        total={200}
        overBudget={true}
        mainCurrency={{
          id: 1,
          name: "Euro",
          symbol: "€",
          code: "EUR",
          rate: 1,
        }}
      />,
    );

    expect(screen.getByTestId("stat-total")).toHaveTextContent("200.00 €");
    expect(screen.getByText("over_budget_warning")).toBeInTheDocument();
    expect(screen.getByText("50.00 €")).toBeInTheDocument(); // 200 - 150 = 50
  });

  it("renders loading state", () => {
    render(
      <CalendarOverview {...defaultProps} due={60} loading={true} />,
    );

    expect(screen.getByTestId("stat-subscriptions")).toHaveTextContent(
      "loading",
    );
    expect(screen.getByTestId("stat-total")).toHaveTextContent("loading");
    expect(screen.getByTestId("stat-due")).toHaveTextContent("loading");
  });
});
