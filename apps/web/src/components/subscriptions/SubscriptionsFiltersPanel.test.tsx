import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import type { Category } from "@/types";
import type { SubscriptionFiltersState } from "./subscriptionsPage.types";
import { SubscriptionsFiltersPanel } from "./SubscriptionsFiltersPanel";

const defaultFilters: SubscriptionFiltersState = {
  state: "all",
  categories: [],
};

const categories: Category[] = [
  { id: "cat-1", name: "Entertainment", user: "u1", color: "#ff0000" },
  { id: "cat-2", name: "Utilities", user: "u1", color: "#00ff00" },
];

describe("SubscriptionsFiltersPanel", () => {
  it("renders state filter buttons (all, active, inactive)", () => {
    render(
      <SubscriptionsFiltersPanel
        categories={[]}
        filters={defaultFilters}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "all" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "active" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "inactive_label" })).toBeInTheDocument();
  });

  it("calls onChange with updated state when a state filter button is clicked", () => {
    const onChange = vi.fn();
    render(
      <SubscriptionsFiltersPanel
        categories={[]}
        filters={defaultFilters}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "active" }));
    expect(onChange).toHaveBeenCalledWith({ state: "active", categories: [] });
  });

  it("does not render category section when categories list is empty", () => {
    render(
      <SubscriptionsFiltersPanel
        categories={[]}
        filters={defaultFilters}
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText("category")).not.toBeInTheDocument();
  });

  it("renders category buttons when categories are provided", () => {
    render(
      <SubscriptionsFiltersPanel
        categories={categories}
        filters={defaultFilters}
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("category")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Entertainment" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Utilities" })).toBeInTheDocument();
  });

  it("adds a category to filters when clicked and it was not selected", () => {
    const onChange = vi.fn();
    render(
      <SubscriptionsFiltersPanel
        categories={categories}
        filters={defaultFilters}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Entertainment" }));
    expect(onChange).toHaveBeenCalledWith({ state: "all", categories: ["cat-1"] });
  });

  it("removes a category from filters when clicked and it was already selected", () => {
    const onChange = vi.fn();
    render(
      <SubscriptionsFiltersPanel
        categories={categories}
        filters={{ state: "all", categories: ["cat-1"] }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Entertainment" }));
    expect(onChange).toHaveBeenCalledWith({ state: "all", categories: [] });
  });
});
