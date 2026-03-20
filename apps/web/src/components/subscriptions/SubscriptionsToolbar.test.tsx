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
});
