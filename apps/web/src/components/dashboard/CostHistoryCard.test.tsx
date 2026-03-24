import { render, screen } from "@testing-library/react";

const capturedTooltipProps: Record<string, unknown> = {};

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container">{children}</div>
  ),
  AreaChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="area-chart">{children}</div>
  ),
  Area: () => <div data-testid="area" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  Tooltip: (props: Record<string, unknown>) => {
    Object.assign(capturedTooltipProps, props);
    return <div data-testid="tooltip" />;
  },
}));

import { CostHistoryCard } from "./CostHistoryCard";

describe("CostHistoryCard", () => {
  it("renders the chart when data is non-empty", () => {
    const data = [
      { name: "Jan", cost: 100 },
      { name: "Feb", cost: 150 },
    ];

    render(
      <CostHistoryCard data={data} formatValue={(v) => `$${v}`} />,
    );

    expect(screen.getByText("cost_history")).toBeInTheDocument();
    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("area-chart")).toBeInTheDocument();
  });

  it("renders the empty state when data is empty", () => {
    render(
      <CostHistoryCard data={[]} formatValue={(v) => `$${v}`} />,
    );

    expect(screen.getByText("cost_history")).toBeInTheDocument();
    expect(screen.getByText("no_results")).toBeInTheDocument();
    expect(screen.queryByTestId("area-chart")).not.toBeInTheDocument();
  });

  it("tooltip formatter calls formatValue", () => {
    const data = [{ name: "Jan", cost: 42 }];
    render(
      <CostHistoryCard data={data} formatValue={(v) => `$${v}`} />,
    );

    const formatter = capturedTooltipProps.formatter as (value: number) => [string, string];
    expect(formatter).toBeDefined();
    const result = formatter(42);
    expect(result).toEqual(["$42", "cost"]);
  });
});
