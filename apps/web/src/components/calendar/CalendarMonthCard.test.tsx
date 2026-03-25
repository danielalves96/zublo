import { fireEvent, render, screen } from "@testing-library/react";

import type { Currency, PaymentRecord, Subscription } from "@/types";

const mocks = vi.hoisted(() => ({
  getColorForSub: vi.fn(() => "bg-blue-500/15"),
  getLogoUrl: vi.fn((sub: Subscription) => {
    if (sub.id === "sub-1") {
      return "https://cdn.example.com/netflix.png";
    }

    if (sub.id === "sub-2") {
      return "https://cdn.example.com/spotify.png";
    }

    return null;
  }),
  getPaymentRecord: vi.fn(),
  toDateStr: vi.fn((date: Date) => date.toISOString().slice(0, 10)),
  toMain: vi.fn((price: number) => price),
  formatPrice: vi.fn((price: number, symbol: string) => `${price.toFixed(2)} ${symbol}`),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
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

import { CalendarMonthCard } from "./CalendarMonthCard";

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

describe("CalendarMonthCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the month header and delegates navigation controls", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    const onGoToday = vi.fn();

    const { container } = render(
      <CalendarMonthCard
        month={4}
        year={2026}
        now={new Date(2026, 2, 20)}
        daysInMonth={30}
        isCurrentMonth={false}
        loading={false}
        statsCount={2}
        selectedDay={null}
        allCells={[{ day: 1, type: "current" }]}
        entriesByDay={{}}
        mainCurrency={getCurrency()}
        currencyById={new Map([["cur-1", getCurrency()]])}
        paymentTracking={false}
        paymentRecords={[]}
        onPrev={onPrev}
        onNext={onNext}
        onGoToday={onGoToday}
        onSelectDay={vi.fn()}
      />,
    );

    expect(screen.getByText("april 2026")).toBeInTheDocument();
    expect(container).toHaveTextContent("apr 1 - 30, 2026");
    expect(screen.getByText("2 events")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button")[0]);
    fireEvent.click(screen.getAllByRole("button")[1]);
    fireEvent.click(screen.getByRole("button", { name: "today" }));

    expect(onPrev).toHaveBeenCalledTimes(1);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onGoToday).toHaveBeenCalledTimes(1);
  });

  it("renders day entries, payment states, overflow, and selection behavior", () => {
    const onSelectDay = vi.fn();
    const subscriptionA = getSubscription({ id: "sub-1", name: "Netflix", price: 10 });
    const subscriptionB = getSubscription({ id: "sub-2", name: "Spotify", price: 20 });
    const subscriptionC = getSubscription({ id: "sub-3", name: "Drive", price: 30 });
    const subscriptionD = getSubscription({ id: "sub-4", name: "Cloud", price: 40 });
    const paymentRecords: PaymentRecord[] = [
      {
        id: "pr-1",
        subscription_id: "sub-1",
        user: "user-1",
        due_date: "2026-04-10",
        paid_at: "2026-04-10T08:00:00Z",
      },
    ];

    mocks.getPaymentRecord.mockImplementation(
      (records: PaymentRecord[], subscriptionId: string) =>
        records.find((record) => record.subscription_id === subscriptionId),
    );

    const { container } = render(
      <CalendarMonthCard
        month={4}
        year={2026}
        now={new Date(2026, 3, 15)}
        daysInMonth={30}
        isCurrentMonth={true}
        loading={false}
        statsCount={4}
        selectedDay={10}
        allCells={[
          { day: 30, type: "prev" },
          { day: 10, type: "current" },
          { day: 11, type: "current" },
        ]}
        entriesByDay={{
          10: [
            { sub: subscriptionA, date: new Date(2026, 3, 10) },
            { sub: subscriptionB, date: new Date(2026, 3, 10) },
            { sub: subscriptionC, date: new Date(2026, 3, 10) },
            { sub: subscriptionD, date: new Date(2026, 3, 10) },
          ],
        }}
        mainCurrency={getCurrency()}
        currencyById={new Map([["cur-1", getCurrency()]])}
        paymentTracking
        paymentRecords={paymentRecords}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onGoToday={vi.fn()}
        onSelectDay={onSelectDay}
      />,
    );

    expect(screen.getByText("10.00 $")).toBeInTheDocument();
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("Spotify")).toBeInTheDocument();
    expect(screen.getByText("Drive")).toBeInTheDocument();
    expect(screen.getByText("+1 more")).toBeInTheDocument();
    expect(container.querySelector("img")).toBeNull();
    expect(mocks.getPaymentRecord).toHaveBeenCalledWith(
      paymentRecords,
      "sub-1",
      "2026-04-10",
    );

    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[3]);
    expect(onSelectDay).toHaveBeenCalledWith(null);

    fireEvent.click(screen.getByRole("button", { name: "11" }));
    expect(onSelectDay).toHaveBeenCalledWith(11);

    // Cover disabled/other-month button click (line 172)
    const otherMonthButton = screen.getByRole("button", { name: "30" });
    fireEvent.click(otherMonthButton);
    expect(onSelectDay).not.toHaveBeenCalledWith(30);
  });

  it("shows singular 'event' badge when statsCount is 1", () => {
    render(
      <CalendarMonthCard
        month={4}
        year={2026}
        now={new Date(2026, 2, 20)}
        daysInMonth={30}
        isCurrentMonth={false}
        loading={false}
        statsCount={1}
        selectedDay={null}
        allCells={[{ day: 1, type: "current" }]}
        entriesByDay={{}}
        mainCurrency={getCurrency()}
        currencyById={new Map([["cur-1", getCurrency()]])}
        paymentTracking={false}
        paymentRecords={[]}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onGoToday={vi.fn()}
        onSelectDay={vi.fn()}
      />,
    );

    expect(screen.getByText("1 event")).toBeInTheDocument();
  });

  it("hides the stats badge and today button when already on the current month with zero stats", () => {
    render(
      <CalendarMonthCard
        month={4}
        year={2026}
        now={new Date(2026, 3, 20)}
        daysInMonth={30}
        isCurrentMonth={true}
        loading={false}
        statsCount={0}
        selectedDay={null}
        allCells={[{ day: 20, type: "current" }]}
        entriesByDay={{}}
        mainCurrency={getCurrency()}
        currencyById={new Map([["cur-1", getCurrency()]])}
        paymentTracking={false}
        paymentRecords={[]}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onGoToday={vi.fn()}
        onSelectDay={vi.fn()}
      />,
    );

    expect(screen.queryByText(/events?/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "today" })).not.toBeInTheDocument();
  });

  it("highlights today and hides entries while loading", () => {
    render(
      <CalendarMonthCard
        month={4}
        year={2026}
        now={new Date(2026, 3, 10)}
        daysInMonth={30}
        isCurrentMonth={true}
        loading={true}
        statsCount={0}
        selectedDay={null}
        allCells={[{ day: 10, type: "current" }]}
        entriesByDay={{
          10: [{ sub: getSubscription(), date: new Date(2026, 3, 10) }],
        }}
        mainCurrency={getCurrency()}
        currencyById={new Map([["cur-1", getCurrency()]])}
        paymentTracking={false}
        paymentRecords={[]}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onGoToday={vi.fn()}
        onSelectDay={vi.fn()}
      />,
    );

    const dayBadge = screen.getByText("10");
    expect(dayBadge.className).toContain("bg-primary");
    expect(screen.queryByText("Netflix")).not.toBeInTheDocument();
  });

  it("renders image logo directly without paymentTracking and handles onError", () => {
    const subscriptionA = getSubscription({ id: "sub-1", name: "Netflix", price: 10 });
    mocks.getLogoUrl.mockReturnValue("https://cdn.example.com/netflix.png");
    
    render(
      <CalendarMonthCard
        month={4}
        year={2026}
        now={new Date(2026, 3, 15)}
        daysInMonth={30}
        isCurrentMonth={true}
        loading={false}
        statsCount={4}
        selectedDay={10}
        allCells={[
          { day: 10, type: "current" },
        ]}
        entriesByDay={{
          10: [
            { sub: subscriptionA, date: new Date(2026, 3, 10) },
          ],
        }}
        mainCurrency={getCurrency()}
        currencyById={new Map([["cur-1", getCurrency()]])}
        paymentTracking={false}
        paymentRecords={[]}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onGoToday={vi.fn()}
        onSelectDay={vi.fn()}
      />,
    );

    const img = document.querySelector("img") as HTMLImageElement;
    fireEvent.error(img);
    expect(img.style.display).toBe("none");
  });

  it("shows overdue payment indicator when payment tracking is enabled and the entry is unpaid", () => {
    const subscription = getSubscription({ id: "sub-overdue", name: "Overdue" });
    mocks.getLogoUrl.mockReturnValue("https://cdn.example.com/overdue.png");
    mocks.getPaymentRecord.mockReturnValue(undefined);

    const { container } = render(
      <CalendarMonthCard
        month={4}
        year={2026}
        now={new Date(2026, 3, 15)}
        daysInMonth={30}
        isCurrentMonth={true}
        loading={false}
        statsCount={1}
        selectedDay={null}
        allCells={[{ day: 10, type: "current" }]}
        entriesByDay={{
          10: [{ sub: subscription, date: new Date(2026, 3, 10) }],
        }}
        mainCurrency={getCurrency()}
        currencyById={new Map([["cur-1", getCurrency()]])}
        paymentTracking
        paymentRecords={[]}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onGoToday={vi.fn()}
        onSelectDay={vi.fn()}
      />,
    );

    expect(container.querySelector(".text-red-500")).not.toBeNull();
    expect(container.querySelector("img")).toBeNull();
  });

  it("renders the logo with no payment status icon when tracking is enabled for a future unpaid entry", () => {
    const subscription = getSubscription({ id: "sub-future", name: "Future" });
    mocks.getLogoUrl.mockReturnValue("https://cdn.example.com/future.png");
    mocks.getPaymentRecord.mockReturnValue(undefined);

    const { container } = render(
      <CalendarMonthCard
        month={4}
        year={2026}
        now={new Date(2026, 3, 10)}
        daysInMonth={30}
        isCurrentMonth={true}
        loading={false}
        statsCount={1}
        selectedDay={null}
        allCells={[{ day: 20, type: "current" }]}
        entriesByDay={{
          20: [{ sub: subscription, date: new Date(2026, 3, 20) }],
        }}
        mainCurrency={getCurrency()}
        currencyById={new Map([["cur-1", getCurrency()]])}
        paymentTracking
        paymentRecords={[]}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onGoToday={vi.fn()}
        onSelectDay={vi.fn()}
      />,
    );

    expect(container.querySelector(".text-red-500")).toBeNull();
    expect(container.querySelector(".text-green-500")).toBeNull();
    expect(container.querySelector("img")).not.toBeNull();
  });

  it("renders the fallback initial and hides the entry price when there is no logo or main currency", () => {
    const subscription = getSubscription({
      id: "sub-no-logo",
      name: "Archive",
      price: 15,
    });
    mocks.getLogoUrl.mockReturnValue(null);

    render(
      <CalendarMonthCard
        month={4}
        year={2026}
        now={new Date(2026, 3, 15)}
        daysInMonth={30}
        isCurrentMonth={true}
        loading={false}
        statsCount={1}
        selectedDay={null}
        allCells={[{ day: 10, type: "current" }]}
        entriesByDay={{
          10: [{ sub: subscription, date: new Date(2026, 3, 10) }],
        }}
        mainCurrency={undefined}
        currencyById={new Map([["cur-1", getCurrency()]])}
        paymentTracking={false}
        paymentRecords={[]}
        onPrev={vi.fn()}
        onNext={vi.fn()}
        onGoToday={vi.fn()}
        onSelectDay={vi.fn()}
      />,
    );

    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("Archive")).toBeInTheDocument();
    expect(screen.queryByText("15.00 $")).not.toBeInTheDocument();
  });
});
