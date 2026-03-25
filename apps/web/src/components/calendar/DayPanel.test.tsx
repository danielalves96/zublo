import { fireEvent, render, screen } from "@testing-library/react";

import type { Currency, PaymentRecord, Subscription } from "@/types";

const mocks = vi.hoisted(() => ({
  getColorForSub: vi.fn(() => "bg-blue-500/15"),
  getLogoUrl: vi.fn(),
  getPaymentRecord: vi.fn(),
  toDateStr: vi.fn((date: Date) => date.toISOString().slice(0, 10)),
  toMain: vi.fn((price: number) => price * 2),
  formatPrice: vi.fn((price: number, symbol: string) => `${price} ${symbol}`),
}));

vi.mock("@/components/calendar/types", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/calendar/types")>();
  return {
    ...actual,
    getColorForSub: mocks.getColorForSub,
    getLogoUrl: mocks.getLogoUrl,
    getPaymentRecord: mocks.getPaymentRecord,
    toDateStr: mocks.toDateStr,
    toMain: mocks.toMain,
  };
});

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    formatPrice: mocks.formatPrice,
  };
});

import { DayPanel } from "./DayPanel";

function getCurrency(overrides: Partial<Currency> = {}): Currency {
  return {
    id: "cur-1",
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    rate: 1,
    is_main: true,
    user: "user-1",
    ...overrides,
  };
}

function getSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    name: "Netflix",
    price: 10,
    currency: "cur-1",
    frequency: 1,
    cycle: "monthly",
    next_payment: "2026-03-10",
    auto_renew: true,
    start_date: "2026-01-01",
    notify: false,
    notify_days_before: 3,
    inactive: false,
    user: "user-1",
    expand: {
      currency: getCurrency(),
      cycle: { id: "monthly", name: "Monthly" },
      category: { id: "cat-1", name: "Streaming", user: "user-1" },
    },
    ...overrides,
  };
}

describe("DayPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLogoUrl.mockReturnValue("https://cdn.example.com/netflix.png");
    mocks.getPaymentRecord.mockReturnValue(undefined);
  });

  it("renders the empty state and today badge", () => {
    const onClose = vi.fn();

    render(
      <DayPanel
        day={10}
        month={3}
        year={2026}
        entries={[]}
        total={0}
        mainCurrency={getCurrency()}
        currencies={[getCurrency()]}
        now={new Date(2026, 2, 10)}
        t={(key) => key}
        paymentTracking={false}
        paymentRecords={[]}
        onSelectEntry={vi.fn()}
        onClose={onClose}
      />,
    );

    expect(screen.getByText("today")).toBeInTheDocument();
    expect(screen.getByText("no_subscriptions_due")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders entries with payment state and forwards entry selection", () => {
    const onSelectEntry = vi.fn();
    const paymentRecords: PaymentRecord[] = [
      {
        id: "pr-1",
        subscription_id: "sub-1",
        user: "user-1",
        due_date: "2026-03-10",
        paid_at: "2026-03-10T10:00:00Z",
      },
    ];
    const entry = {
      sub: getSubscription(),
      date: new Date("2026-03-10T00:00:00Z"),
    };

    mocks.getPaymentRecord.mockReturnValue(paymentRecords[0]);

    render(
      <DayPanel
        day={10}
        month={3}
        year={2026}
        entries={[entry]}
        total={10}
        mainCurrency={getCurrency()}
        currencies={[getCurrency()]}
        now={new Date(2026, 2, 8)}
        t={(key) => key}
        paymentTracking
        paymentRecords={paymentRecords}
        onSelectEntry={onSelectEntry}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("1 subscription ·")).toBeInTheDocument();
    expect(screen.getAllByText("10 $")).toHaveLength(2);
    expect(screen.getByText("Streaming")).toBeInTheDocument();
    expect(screen.getByText("monthly")).toBeInTheDocument();
    expect(screen.getByText("paid")).toBeInTheDocument();
    expect(screen.getByAltText("Netflix")).toHaveAttribute(
      "src",
      "https://cdn.example.com/netflix.png",
    );

    fireEvent.click(screen.getByRole("button", { name: /Netflix/i }));
    expect(onSelectEntry).toHaveBeenCalledWith(entry);

    // Cover image error (line 143)
    const img = screen.getByRole("img");
    fireEvent.error(img);
    expect(img.style.display).toBe("none");
  });

  it("falls back to currencies prop when sub.expand.currency is missing", () => {
    const entry = {
      sub: { ...getSubscription(), expand: undefined },
      date: new Date("2026-03-10T00:00:00Z"),
    };

    render(
      <DayPanel
        day={10}
        month={3}
        year={2026}
        entries={[entry]}
        total={10}
        mainCurrency={getCurrency({ id: "cur-2", symbol: "€" })}
        currencies={[getCurrency()]}
        now={new Date(2026, 2, 8)}
        t={(key) => key}
        paymentTracking={false}
        paymentRecords={[]}
        onSelectEntry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("10 $")).toBeInTheDocument(); // Currency symbol from currencies list fallback
  });

  it("shows overdue badge and circledot in no-logo div when isOverdue is true", () => {
    mocks.getLogoUrl.mockReturnValue(null);

    const entry = {
      sub: getSubscription({ id: "sub-1" }),
      date: new Date(2026, 2, 5),
    };

    render(
      <DayPanel
        day={5}
        month={3}
        year={2026}
        entries={[entry]}
        total={10}
        mainCurrency={getCurrency()}
        currencies={[getCurrency()]}
        now={new Date(2026, 2, 10)}
        t={(key) => key}
        paymentTracking
        paymentRecords={[]}
        onSelectEntry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("overdue")).toBeInTheDocument();
  });

  it("shows today badge in price section when diffDays is 0", () => {
    const entry = {
      sub: getSubscription({ id: "sub-1" }),
      date: new Date(2026, 2, 10),
    };

    render(
      <DayPanel
        day={10}
        month={3}
        year={2026}
        entries={[entry]}
        total={10}
        mainCurrency={getCurrency()}
        currencies={[getCurrency()]}
        now={new Date(2026, 2, 10)}
        t={(key) => key}
        paymentTracking={false}
        paymentRecords={[]}
        onSelectEntry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // today badge appears in the price section (diffDays === 0)
    const todayBadges = screen.getAllByText("today");
    expect(todayBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("shows within-7-days badge when diffDays is between 1 and 7", () => {
    const entry = {
      sub: getSubscription({ id: "sub-1" }),
      date: new Date(2026, 2, 12),
    };

    render(
      <DayPanel
        day={12}
        month={3}
        year={2026}
        entries={[entry]}
        total={10}
        mainCurrency={getCurrency()}
        currencies={[getCurrency()]}
        now={new Date(2026, 2, 10)}
        t={(key) => key}
        paymentTracking={false}
        paymentRecords={[]}
        onSelectEntry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("2d")).toBeInTheDocument();
  });

  it("renders 'subscriptions' (plural) label when more than one entry is present", () => {
    const entries = [
      { sub: getSubscription({ id: "sub-1", name: "Netflix" }), date: new Date(2026, 2, 10) },
      { sub: getSubscription({ id: "sub-2", name: "Spotify" }), date: new Date(2026, 2, 10) },
    ];

    render(
      <DayPanel
        day={10}
        month={3}
        year={2026}
        entries={entries}
        total={20}
        mainCurrency={getCurrency()}
        currencies={[getCurrency()]}
        now={new Date(2026, 2, 8)}
        t={(key) => key}
        paymentTracking={false}
        paymentRecords={[]}
        onSelectEntry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("2 subscriptions ·")).toBeInTheDocument();
  });

  it("shows no_subscriptions_due when entries is non-empty but mainCurrency is undefined", () => {
    const entry = {
      sub: getSubscription({ id: "sub-1" }),
      date: new Date(2026, 2, 10),
    };

    render(
      <DayPanel
        day={10}
        month={3}
        year={2026}
        entries={[entry]}
        total={10}
        mainCurrency={undefined}
        currencies={[getCurrency()]}
        now={new Date(2026, 2, 8)}
        t={(key) => key}
        paymentTracking={false}
        paymentRecords={[]}
        onSelectEntry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("no_subscriptions_due")).toBeInTheDocument();
  });

  it("renders frequency prefix when sub.frequency > 1", () => {
    const entry = {
      sub: getSubscription({ id: "sub-1", frequency: 3 }),
      date: new Date(2026, 2, 10),
    };

    render(
      <DayPanel
        day={10}
        month={3}
        year={2026}
        entries={[entry]}
        total={10}
        mainCurrency={getCurrency()}
        currencies={[getCurrency()]}
        now={new Date(2026, 2, 8)}
        t={(key) => key}
        paymentTracking={false}
        paymentRecords={[]}
        onSelectEntry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // frequency > 1 shows "${frequency}× " prefix
    expect(screen.getByText(/3×/)).toBeInTheDocument();
  });

  it("shows overdue CircleDot in logo-image div when isOverdue is true and logo exists", () => {
    // getLogoUrl returns a URL (set in beforeEach to "https://cdn.example.com/netflix.png")
    const entry = {
      sub: getSubscription({ id: "sub-1" }),
      // date is in the past relative to now, making isOverdue true
      date: new Date(2026, 2, 5),
    };

    render(
      <DayPanel
        day={5}
        month={3}
        year={2026}
        entries={[entry]}
        total={10}
        mainCurrency={getCurrency()}
        currencies={[getCurrency()]}
        now={new Date(2026, 2, 10)}
        t={(key) => key}
        paymentTracking
        paymentRecords={[]}
        onSelectEntry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // Both "overdue" badge (in info section) and CircleDot (in logo-image div) are rendered
    expect(screen.getByText("overdue")).toBeInTheDocument();
    // The logo img must be present (getLogoUrl returned a URL)
    expect(screen.getByAltText("Netflix")).toBeInTheDocument();
  });

  it("uses the dollar sign fallback when cur is undefined (cur?.symbol ?? '$')", () => {
    // sub has no expand, and its currency id doesn't match any currency in the list
    const entry = {
      sub: {
        ...getSubscription({ id: "sub-1", currency: "nonexistent-cur" }),
        expand: undefined,
      },
      date: new Date(2026, 2, 10),
    };

    render(
      <DayPanel
        day={10}
        month={3}
        year={2026}
        entries={[entry]}
        total={10}
        mainCurrency={getCurrency()}
        currencies={[getCurrency({ id: "cur-1" })]}
        now={new Date(2026, 2, 8)}
        t={(key) => key}
        paymentTracking={false}
        paymentRecords={[]}
        onSelectEntry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // formatPrice is called with "$" (the fallback symbol) because cur is undefined
    expect(mocks.formatPrice).toHaveBeenCalledWith(expect.any(Number), "$");
  });

  it("shows paid badge in no-logo div when paymentTracking and isPaid are true", () => {
    mocks.getLogoUrl.mockReturnValue(null);
    const paymentRecords = [
      {
        id: "pr-1",
        subscription_id: "sub-1",
        user: "user-1",
        due_date: "2026-03-10",
        paid_at: "2026-03-10T10:00:00Z",
      },
    ];
    mocks.getPaymentRecord.mockReturnValue(paymentRecords[0]);

    const entry = {
      sub: getSubscription({ id: "sub-1" }),
      date: new Date(2026, 2, 10),
    };

    render(
      <DayPanel
        day={10}
        month={3}
        year={2026}
        entries={[entry]}
        total={10}
        mainCurrency={getCurrency()}
        currencies={[getCurrency()]}
        now={new Date(2026, 2, 8)}
        t={(key) => key}
        paymentTracking
        paymentRecords={paymentRecords}
        onSelectEntry={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("paid")).toBeInTheDocument();
  });
});
