import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { SubscriptionsToolbar } from "./SubscriptionsToolbar";

describe("SubscriptionsToolbar", () => {
  it("renders the controls and delegates interactions", () => {
    const onSearchChange = vi.fn();
    const onToggleFilters = vi.fn();
    const onCycleSort = vi.fn();

    render(
      <SubscriptionsToolbar
        searchTerm="net"
        showFilters={false}
        onSearchChange={onSearchChange}
        onToggleFilters={onToggleFilters}
        onCycleSort={onCycleSort}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("search..."), {
      target: { value: "spotify" },
    });
    fireEvent.click(screen.getByRole("button", { name: "filter" }));
    fireEvent.click(screen.getByRole("button", { name: "sort" }));

    expect(onSearchChange).toHaveBeenCalledWith("spotify");
    expect(onToggleFilters).toHaveBeenCalledTimes(1);
    expect(onCycleSort).toHaveBeenCalledTimes(1);
  });

  it("applies active styling to filter button when showFilters is true", () => {
    const { container } = render(
      <SubscriptionsToolbar
        searchTerm=""
        showFilters={true}
        onSearchChange={vi.fn()}
        onToggleFilters={vi.fn()}
        onCycleSort={vi.fn()}
      />,
    );

    const filterButton = screen.getByRole("button", { name: "filter" });
    expect(filterButton.className).toContain("border-border");
    expect(filterButton.className).toContain("bg-accent");

    // The Filter icon inside should have text-primary class
    const filterIcon = container.querySelector(".text-primary");
    expect(filterIcon).toBeInTheDocument();
  });
});
