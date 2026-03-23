import { render, screen } from "@testing-library/react";

vi.mock("@/components/statistics/constants", () => ({
  STATISTICS_COLORS: ["#ff0000", "#00ff00", "#0000ff"],
}));

import { StatisticsBreakdownCard } from "./StatisticsBreakdownCard";

const sampleData = [
  { name: "Netflix", value: 15 },
  { name: "Spotify", value: 10 },
];

describe("StatisticsBreakdownCard", () => {
  it("returns null when data is empty", () => {
    const { container } = render(
      <StatisticsBreakdownCard
        data={[]}
        mainSymbol="$"
        title="By Category"
        totalMonthly={0}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the title and each item with name, price and percentage", () => {
    render(
      <StatisticsBreakdownCard
        data={sampleData}
        mainSymbol="$"
        title="By Category"
        totalMonthly={25}
      />,
    );

    expect(screen.getByText("By Category")).toBeInTheDocument();
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("Spotify")).toBeInTheDocument();
    // percentage: 15/25 = 60.0%, 10/25 = 40.0%
    expect(screen.getByText("60.0%")).toBeInTheDocument();
    expect(screen.getByText("40.0%")).toBeInTheDocument();
  });

  it("shows 0% when totalMonthly is 0", () => {
    render(
      <StatisticsBreakdownCard
        data={[{ name: "Test", value: 10 }]}
        mainSymbol="$"
        title="Test"
        totalMonthly={0}
      />,
    );
    expect(screen.getByText("0%")).toBeInTheDocument();
  });
});
