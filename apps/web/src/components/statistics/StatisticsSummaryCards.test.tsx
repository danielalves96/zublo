import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { StatisticsSummaryCards } from "./StatisticsSummaryCards";

describe("StatisticsSummaryCards", () => {
  it("renders monthly total, yearly total, and subscription count", () => {
    render(
      <StatisticsSummaryCards
        mainSymbol="$"
        subscriptionsCount={6}
        totalMonthly={100}
        totalYearly={1200}
      />,
    );

    expect(screen.getByText("total_monthly")).toBeInTheDocument();
    expect(screen.getByText("100.00 $")).toBeInTheDocument();
    expect(screen.getByText("total_yearly")).toBeInTheDocument();
    expect(screen.getByText("1,200.00 $")).toBeInTheDocument();
    expect(screen.getByText("subscriptions")).toBeInTheDocument();
    expect(screen.getByText("6")).toBeInTheDocument();
  });
});
