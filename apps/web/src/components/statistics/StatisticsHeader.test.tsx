import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { StatisticsHeader } from "./StatisticsHeader";

describe("StatisticsHeader", () => {
  it("renders the heading and allows changing the active grouping", () => {
    const onGroupByChange = vi.fn();

    render(
      <StatisticsHeader
        groupBy="category"
        groupLabels={{
          category: "By Category",
          payment: "By Payment",
          member: "By Member",
        }}
        onGroupByChange={onGroupByChange}
      />,
    );

    expect(screen.getByText("statistics")).toBeInTheDocument();
    expect(
      screen.getByText("Analyze your spending across categories, members, and more."),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "By Payment" }));

    expect(onGroupByChange).toHaveBeenCalledWith("payment");
  });
});
