import { render, screen } from "@testing-library/react";

import { SummaryCard } from "./SummaryCard";

describe("SummaryCard", () => {
  it("renders the title, value, icon, and positive trend", () => {
    render(
      <SummaryCard
        title="Monthly Total"
        value="$120.00"
        icon={<span>ICON</span>}
        trend="+12%"
        trendUp
        gradient="from-blue-500 to-cyan-500"
      />,
    );

    expect(screen.getByText("Monthly Total")).toBeInTheDocument();
    expect(screen.getByText("$120.00")).toBeInTheDocument();
    expect(screen.getByText("ICON")).toBeInTheDocument();
    expect(screen.getByText("+12%")).toBeInTheDocument();
  });

  it("renders a loading placeholder instead of the value when loading", () => {
    const { container } = render(
      <SummaryCard
        title="Monthly Total"
        value="$120.00"
        icon={<span>ICON</span>}
        loading
        trend="-5%"
        trendUp={false}
        gradient="from-red-500 to-orange-500"
      />,
    );

    expect(screen.getByText("Monthly Total")).toBeInTheDocument();
    expect(screen.queryByText("$120.00")).not.toBeInTheDocument();
    expect(screen.getByText("-5%")).toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).toBeTruthy();
  });
});
