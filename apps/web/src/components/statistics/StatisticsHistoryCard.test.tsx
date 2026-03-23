import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart">{children}</div>
  ),
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: () => <div data-testid="tooltip" />,
}));

import { StatisticsHistoryCard } from "./StatisticsHistoryCard";

describe("StatisticsHistoryCard", () => {
  it("renders the cost_history title", () => {
    render(
      <StatisticsHistoryCard data={[{ name: "Jan", cost: 100 }]} mainSymbol="$" />,
    );
    expect(screen.getByText("cost_history")).toBeInTheDocument();
  });

  it("renders the line chart when data is non-empty", () => {
    render(
      <StatisticsHistoryCard
        data={[{ name: "Jan", cost: 100 }, { name: "Feb", cost: 150 }]}
        mainSymbol="$"
      />,
    );
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("line-chart")).toBeInTheDocument();
  });

  it("renders the empty state when data is empty", () => {
    render(<StatisticsHistoryCard data={[]} mainSymbol="$" />);
    expect(screen.getByText("no_results")).toBeInTheDocument();
    expect(screen.queryByTestId("line-chart")).not.toBeInTheDocument();
  });
});
