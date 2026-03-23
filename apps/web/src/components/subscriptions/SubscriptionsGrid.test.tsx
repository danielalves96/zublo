import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const mocks = vi.hoisted(() => ({
  logoUrl: vi.fn(() => "https://cdn.example.com/logo.png"),
}));

vi.mock("@/services/subscriptions", () => ({
  subscriptionsService: { logoUrl: mocks.logoUrl },
}));

vi.mock("@/services/paymentMethods", () => ({
  paymentMethodsService: { iconUrl: vi.fn() },
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    formatPrice: (v: number, s: string) => `${v} ${s}`,
    formatDate: () => "Jan 1, 2026",
    daysUntil: () => 10,
    subscriptionProgress: () => 50,
    toMainCurrency: (v: number) => v,
    toMonthly: (v: number) => v,
  };
});

import type { Subscription } from "@/types";
import { SubscriptionsGrid } from "./SubscriptionsGrid";

function getSub(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    name: "Netflix",
    price: 15,
    currency: "usd",
    frequency: 1,
    cycle: "monthly",
    next_payment: "2026-04-01",
    auto_renew: true,
    start_date: "2026-01-01",
    notify: true,
    notify_days_before: 3,
    inactive: false,
    user: "user-1",
    ...overrides,
  };
}

const baseHandlers = {
  onEdit: vi.fn(),
  onClone: vi.fn(),
  onRenew: vi.fn(),
  onDelete: vi.fn(),
};

describe("SubscriptionsGrid", () => {
  beforeEach(() => vi.clearAllMocks());

  it("renders skeleton loading placeholders when isLoading is true", () => {
    const { container } = render(
      <SubscriptionsGrid isLoading subscriptions={[]} {...baseHandlers} />,
    );
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("renders the empty state when subscriptions list is empty and not loading", () => {
    render(
      <SubscriptionsGrid isLoading={false} subscriptions={[]} {...baseHandlers} />,
    );
    expect(screen.getByText("no_subscriptions")).toBeInTheDocument();
    expect(screen.getByText("no_subscriptions_hint")).toBeInTheDocument();
  });

  it("renders subscription cards when subscriptions are provided", () => {
    render(
      <SubscriptionsGrid
        isLoading={false}
        subscriptions={[getSub(), getSub({ id: "sub-2", name: "Spotify" })]}
        {...baseHandlers}
      />,
    );
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("Spotify")).toBeInTheDocument();
  });
});
