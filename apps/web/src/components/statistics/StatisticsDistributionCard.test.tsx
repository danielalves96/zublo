import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/components/statistics/constants", () => ({
  STATISTICS_COLORS: ["#ff0000", "#00ff00", "#0000ff"],
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  PieChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="pie-chart">{children}</div>
  ),
  Pie: ({ label }: { label?: (entry: { name: string; percent: number }) => string }) => (
    <div data-testid="pie">
      {label && <span data-testid="pie-label">{label({ name: "Netflix", percent: 0.5 })}</span>}
    </div>
  ),
  Cell: () => <div data-testid="cell" />,
  Tooltip: ({ formatter }: { formatter?: (value: number) => string }) => (
    <div data-testid="tooltip">
      {formatter && <span data-testid="tooltip-value">{formatter(15)}</span>}
    </div>
  ),
  Legend: () => <div data-testid="legend" />,
}));

import { StatisticsDistributionCard } from "./StatisticsDistributionCard";

describe("StatisticsDistributionCard", () => {
  it("renders the title", () => {
    render(
      <StatisticsDistributionCard
        data={[{ name: "Netflix", value: 15 }]}
        mainSymbol="$"
        title="Distribution"
      />,
    );
    expect(screen.getByText("Distribution")).toBeInTheDocument();
  });

  it("renders the pie chart when data is non-empty", () => {
    render(
      <StatisticsDistributionCard
        data={[{ name: "A", value: 10 }, { name: "B", value: 20 }]}
        mainSymbol="$"
        title="By Category"
      />,
    );
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("renders the empty state when data is empty", () => {
    render(
      <StatisticsDistributionCard data={[]} mainSymbol="$" title="By Category" />,
    );
    expect(screen.getByText("no_results")).toBeInTheDocument();
    expect(screen.queryByTestId("pie-chart")).not.toBeInTheDocument();
  });
});
