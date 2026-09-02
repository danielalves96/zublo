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
    const onViewChange = vi.fn();

    render(
      <SubscriptionsToolbar
        searchTerm="net"
        showFilters={false}
        view="grid"
        onSearchChange={onSearchChange}
        onToggleFilters={onToggleFilters}
        onCycleSort={onCycleSort}
        onViewChange={onViewChange}
      />,
    );

    fireEvent.change(screen.getByPlaceholderText("search..."), {
      target: { value: "spotify" },
    });
    fireEvent.click(screen.getByRole("button", { name: "filter" }));
    fireEvent.click(screen.getByRole("button", { name: "sort" }));
    fireEvent.click(screen.getByRole("button", { name: "list_view" }));

    expect(onSearchChange).toHaveBeenCalledWith("spotify");
    expect(onToggleFilters).toHaveBeenCalledTimes(1);
    expect(onCycleSort).toHaveBeenCalledTimes(1);
    expect(onViewChange).toHaveBeenCalledWith("list");
    expect(screen.getByRole("button", { name: "grid_view" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("applies active styling to filter button when showFilters is true", () => {
    const { container } = render(
      <SubscriptionsToolbar
        searchTerm=""
        showFilters={true}
        view="list"
        onSearchChange={vi.fn()}
        onToggleFilters={vi.fn()}
        onCycleSort={vi.fn()}
        onViewChange={vi.fn()}
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
