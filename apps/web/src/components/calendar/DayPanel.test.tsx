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
  });
});
