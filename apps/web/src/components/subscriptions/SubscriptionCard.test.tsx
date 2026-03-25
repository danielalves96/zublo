import { fireEvent, render, screen } from "@testing-library/react";

import type { Currency, PaymentMethod, Subscription } from "@/types";

const mocks = vi.hoisted(() => ({
  paymentIconUrl: vi.fn(),
  subscriptionLogoUrl: vi.fn(),
  formatPrice: vi.fn((price: number, symbol: string) => `${price.toFixed(2)} ${symbol}`),
  formatDate: vi.fn(() => "Apr 10, 2026"),
  daysUntil: vi.fn(() => 3),
  subscriptionProgress: vi.fn(() => 75),
  toMainCurrency: vi.fn((price: number) => price * 2),
  toMonthly: vi.fn((price: number) => price / 2),
  windowOpen: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/services/paymentMethods", () => ({
  paymentMethodsService: {
    iconUrl: mocks.paymentIconUrl,
  },
}));

vi.mock("@/services/subscriptions", () => ({
  subscriptionsService: {
    logoUrl: mocks.subscriptionLogoUrl,
  },
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    formatPrice: mocks.formatPrice,
    formatDate: mocks.formatDate,
    daysUntil: mocks.daysUntil,
    subscriptionProgress: mocks.subscriptionProgress,
    toMainCurrency: mocks.toMainCurrency,
    toMonthly: mocks.toMonthly,
  };
});

import { SubscriptionCard } from "./SubscriptionCard";

function getCurrency(overrides: Partial<Currency> = {}): Currency {
  return {
    id: "cur-1",
    name: "US Dollar",
    code: "USD",
    symbol: "$",
    rate: 1,
    is_main: false,
    user: "user-1",
    ...overrides,
  };
}

function getPaymentMethod(
  overrides: Partial<PaymentMethod> = {},
): PaymentMethod {
  return {
    id: "pm-1",
    name: "Visa",
    user: "user-1",
    ...overrides,
  };
}

function getSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    name: "Netflix",
    logo: "netflix.png",
    price: 20,
    currency: "cur-2",
    frequency: 1,
    cycle: "monthly",
    next_payment: "2026-04-10",
    url: "https://example.com/netflix",
    auto_renew: true,
    start_date: "2026-01-01",
    notify: true,
    notify_days_before: 3,
    inactive: false,
    user: "user-1",
    expand: {
      currency: getCurrency({ id: "cur-2", symbol: "R$", rate: 5 }),
      cycle: { id: "monthly", name: "Monthly" },
      category: { id: "cat-1", name: "Streaming", user: "user-1" },
      payer: { id: "payer-1", name: "Daniel", user: "user-1" },
      payment_method: getPaymentMethod({ icon: "visa.png" }),
    },
    ...overrides,
  };
}

describe("SubscriptionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.subscriptionLogoUrl.mockReturnValue("https://cdn.example.com/netflix.png");
    mocks.paymentIconUrl.mockReturnValue("https://cdn.example.com/visa.png");
    vi.stubGlobal("open", mocks.windowOpen);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("renders converted monthly pricing, progress, payment details, and action buttons", () => {
    const onEdit = vi.fn();
    const onClone = vi.fn();
    const onRenew = vi.fn();
    const onDelete = vi.fn();

    render(
      <SubscriptionCard
        sub={getSubscription()}
        mainCurrency={getCurrency({ is_main: true, symbol: "$" })}
        convertCurrency
        showMonthly
        showProgress
        onEdit={onEdit}
        onClone={onClone}
        onRenew={onRenew}
        onDelete={onDelete}
      />,
    );

    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("Streaming")).toBeInTheDocument();
    expect(screen.getByText("20.00 $")).toBeInTheDocument();
    expect(screen.getByText("monthly")).toBeInTheDocument();
    expect(screen.getByText("next")).toBeInTheDocument();
    expect(screen.getByText("Apr 10, 2026")).toBeInTheDocument();
    expect(screen.getAllByText("3d")).toHaveLength(2);
    expect(screen.getByText("billing_cycle")).toBeInTheDocument();
    expect(screen.getByText("pays Daniel")).toBeInTheDocument();
    expect(screen.getByAltText("Netflix")).toHaveAttribute(
      "src",
      "https://cdn.example.com/netflix.png",
    );
    expect(screen.getByAltText("Visa")).toHaveAttribute(
      "src",
      "https://cdn.example.com/visa.png",
    );

    fireEvent.click(screen.getByTitle("open_url"));
    fireEvent.click(screen.getByTitle("edit"));
    fireEvent.click(screen.getByTitle("clone"));
    fireEvent.click(screen.getByTitle("renew"));
    fireEvent.click(screen.getByTitle("delete"));

    expect(mocks.windowOpen).toHaveBeenCalledWith(
      "https://example.com/netflix",
      "_blank",
    );
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onClone).toHaveBeenCalledTimes(1);
    expect(onRenew).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it("falls back to payment method initials when payment icon image fails to load", () => {
    mocks.paymentIconUrl.mockReturnValue("https://cdn.example.com/my-card.png");
    render(
      <SubscriptionCard
        sub={getSubscription({
          expand: {
            currency: getCurrency({ id: "cur-2", symbol: "R$", rate: 5 }),
            cycle: { id: "monthly", name: "Monthly" },
            payment_method: getPaymentMethod({ name: "My Card", icon: "card.png" }),
          },
        })}
        onEdit={vi.fn()}
        onClone={vi.fn()}
        onRenew={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    const paymentImg = screen.getByAltText("My Card");
    expect(paymentImg).toBeInTheDocument();

    // Simulate load error to trigger the initials fallback
    fireEvent.error(paymentImg);

    expect(screen.queryByAltText("My Card")).not.toBeInTheDocument();
    expect(screen.getByText("MC")).toBeInTheDocument();
  });

  it("hides the days badge when daysUntil returns a negative value", () => {
    mocks.daysUntil.mockReturnValue(-5);

    render(
      <SubscriptionCard
        sub={getSubscription()}
        onEdit={vi.fn()}
        onClone={vi.fn()}
        onRenew={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    // Negative days means days >= 0 is false — no badge rendered
    expect(screen.queryByText(/-5d/)).not.toBeInTheDocument();
  });

  it("uses sub.price directly when showMonthly is false (line 100 false branch)", () => {
    // showMonthly=false → rawPrice = sub.price (not toMonthly)
    render(
      <SubscriptionCard
        sub={getSubscription({ price: 99 })}
        mainCurrency={getCurrency({ is_main: true, symbol: "$" })}
        convertCurrency={false}
        showMonthly={false}
        showProgress={false}
        onEdit={vi.fn()}
        onClone={vi.fn()}
        onRenew={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    // toMonthly should NOT have been called
    expect(mocks.toMonthly).not.toHaveBeenCalled();
    // formatPrice called with raw price 99
    expect(mocks.formatPrice).toHaveBeenCalledWith(99, expect.any(String));
  });

  it("uses rawPrice directly when shouldConvert is false (line 102 false branch)", () => {
    // convertCurrency=false → shouldConvert=false → price = rawPrice
    render(
      <SubscriptionCard
        sub={getSubscription({ price: 50 })}
        mainCurrency={getCurrency({ is_main: true, symbol: "$" })}
        convertCurrency={false}
        showMonthly={false}
        showProgress={false}
        onEdit={vi.fn()}
        onClone={vi.fn()}
        onRenew={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    // toMainCurrency should NOT have been called
    expect(mocks.toMainCurrency).not.toHaveBeenCalled();
  });

  it("renders primary-colored days badge when days > 3 (line 166 false branch)", () => {
    mocks.daysUntil.mockReturnValue(10);
    mocks.subscriptionProgress.mockReturnValue(50);

    render(
      <SubscriptionCard
        sub={getSubscription()}
        mainCurrency={getCurrency({ is_main: true, symbol: "$" })}
        convertCurrency={false}
        showMonthly={false}
        showProgress
        onEdit={vi.fn()}
        onClone={vi.fn()}
        onRenew={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    // days > 3 → badge uses "bg-primary/10" class (not orange)
    const badges = screen.getAllByText("10d");
    // The first occurrence is the badge span in the next-payment row
    expect(badges[0]).not.toHaveClass("bg-orange-500/10");
  });

  it("uses PAYMENT_ICON_MAP src when payment method has no icon but name is in map", () => {
    render(
      <SubscriptionCard
        sub={getSubscription({
          expand: {
            currency: getCurrency({ id: "cur-2", symbol: "R$", rate: 5 }),
            cycle: { id: "monthly", name: "Monthly" },
            payment_method: getPaymentMethod({ name: "Visa", icon: undefined }),
          },
        })}
        onEdit={vi.fn()}
        onClone={vi.fn()}
        onRenew={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByAltText("Visa")).toHaveAttribute("src", "/assets/payments/Visa.png");
  });

  it("defaults frequency to 1 and symbol to $ when frequency is absent and currency has no symbol", () => {
    render(
      <SubscriptionCard
        sub={getSubscription({ frequency: undefined, expand: {} })}
        showMonthly
        convertCurrency={false}
        onEdit={vi.fn()}
        onClone={vi.fn()}
        onRenew={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(mocks.toMonthly).toHaveBeenCalledWith(20, "Monthly", 1);
    expect(mocks.formatPrice).toHaveBeenCalledWith(expect.any(Number), "$");
  });

  it("falls back to $ symbol when mainCurrency has no symbol and shouldConvert is true", () => {
    render(
      <SubscriptionCard
        sub={getSubscription()}
        mainCurrency={getCurrency({ is_main: true, symbol: undefined as unknown as string })}
        convertCurrency
        showMonthly={false}
        onEdit={vi.fn()}
        onClone={vi.fn()}
        onRenew={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(mocks.formatPrice).toHaveBeenCalledWith(expect.any(Number), "$");
  });

  it("uses empty string src when logoUrl returns null", () => {
    mocks.subscriptionLogoUrl.mockReturnValue(null);
    render(
      <SubscriptionCard
        sub={getSubscription()}
        onEdit={vi.fn()}
        onClone={vi.fn()}
        onRenew={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByAltText("Netflix")).toHaveAttribute("src", "");
  });

  it("renders fallback initials and inactive state when data is limited", () => {
    render(
      <SubscriptionCard
        sub={getSubscription({
          logo: undefined,
          inactive: true,
          url: undefined,
          expand: {
            currency: getCurrency({ id: "cur-2", symbol: "R$", rate: 5 }),
            cycle: { id: "yearly", name: "Yearly" },
            payment_method: getPaymentMethod({ name: "Unknown Method", icon: undefined }),
          },
        })}
        mainCurrency={getCurrency({ is_main: true, symbol: "$" })}
        convertCurrency={false}
        showMonthly={false}
        showProgress={false}
        onEdit={vi.fn()}
        onClone={vi.fn()}
        onRenew={vi.fn()}
        onDelete={vi.fn()}
      />,
    );

    expect(screen.getByText("inactive_label")).toBeInTheDocument();
    expect(screen.getByText("Yearly")).toBeInTheDocument();
    expect(screen.getByText("N")).toBeInTheDocument();
    expect(screen.getByText("UM")).toBeInTheDocument();
    expect(screen.queryByText("billing_cycle")).not.toBeInTheDocument();
    expect(screen.queryByTitle("open_url")).not.toBeInTheDocument();
  });
});
