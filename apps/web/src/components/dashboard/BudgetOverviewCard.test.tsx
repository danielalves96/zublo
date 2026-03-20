import { render, screen } from "@testing-library/react";

const { logoUrl } = vi.hoisted(() => ({
  logoUrl: vi.fn(() => "https://cdn.example.com/logo.png"),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/services/subscriptions", () => ({
  subscriptionsService: {
    logoUrl,
  },
}));

import type { Subscription } from "@/types";

import { BudgetOverviewCard } from "./BudgetOverviewCard";

function getSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    name: "Netflix",
    price: 20,
    currency: "usd",
    frequency: 1,
    cycle: "monthly",
    next_payment: "2026-04-10",
    auto_renew: true,
    start_date: "2026-01-01",
    notify: true,
    notify_days_before: 3,
    inactive: false,
    user: "user-1",
    ...overrides,
  };
}

describe("BudgetOverviewCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders budget usage, remaining budget, most expensive subscription, and subscription count", () => {
    render(
      <BudgetOverviewCard
        budget={100}
        budgetUsed={45}
        isOverBudget={false}
        totalMonthly={45}
        subscriptionsCount={4}
        mostExpensive={{
          name: "Netflix",
          monthly: 20,
          logo: "logo.png",
          record: getSubscription(),
        }}
        formatValue={(value) => `$${value.toFixed(2)}`}
      />,
    );

    expect(screen.getByText("budget_overview")).toBeInTheDocument();
    expect(screen.getByText("$45.00")).toBeInTheDocument();
    expect(screen.getByText("$100.00")).toBeInTheDocument();
    expect(screen.getByText("45.0% budget_used")).toBeInTheDocument();
    expect(screen.getByText("budget_remaining:")).toBeInTheDocument();
    expect(screen.getByText("most_expensive_sub")).toBeInTheDocument();
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(logoUrl).toHaveBeenCalledWith(expect.objectContaining({ id: "sub-1" }));
    expect(screen.getByAltText("Netflix")).toHaveAttribute(
      "src",
      "https://cdn.example.com/logo.png",
    );
  });

  it("renders the empty budget state and over-budget indicator", () => {
    const { rerender } = render(
      <BudgetOverviewCard
        budget={0}
        budgetUsed={0}
        isOverBudget={false}
        subscriptionsCount={2}
        mostExpensive={null}
        formatValue={(value) => `$${value.toFixed(2)}`}
      />,
    );

    expect(screen.getByText("no_budget_set")).toBeInTheDocument();
    expect(screen.getByText("budget_hint")).toBeInTheDocument();

    rerender(
      <BudgetOverviewCard
        budget={50}
        budgetUsed={100}
        isOverBudget
        totalMonthly={70}
        subscriptionsCount={2}
        mostExpensive={null}
        formatValue={(value) => `$${value.toFixed(2)}`}
      />,
    );

    expect(screen.getByText("budget_over")).toBeInTheDocument();
  });
});
