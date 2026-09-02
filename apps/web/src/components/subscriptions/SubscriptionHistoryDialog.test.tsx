import { render, screen, waitFor } from "@testing-library/react";

import { createQueryClientWrapper } from "@/test/query-client";
import type {
  Subscription,
  SubscriptionHistory,
  SubscriptionHistoryEvent,
} from "@/types";

const mocks = vi.hoisted(() => ({
  getHistory: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: Record<string, unknown>) =>
      options ? `${key}:${Object.values(options).join(",")}` : key,
  }),
}));

vi.mock("@/services/subscriptionHistory", () => ({
  subscriptionHistoryService: { get: mocks.getHistory },
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    formatPrice: (value: number, symbol: string) => `${value.toFixed(2)} ${symbol}`,
    formatDate: (value: string) => `date(${value})`,
  };
});

import { SubscriptionHistoryDialog } from "./SubscriptionHistoryDialog";

function getSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    name: "Netflix",
    price: 15,
    currency: "cur-1",
    frequency: 1,
    cycle: "monthly",
    next_payment: "2026-09-01",
    auto_renew: true,
    start_date: "2026-01-01",
    notify: true,
    notify_days_before: 3,
    inactive: false,
    user: "user-1",
    ...overrides,
  };
}

function getEvent(
  overrides: Partial<SubscriptionHistoryEvent> = {},
): SubscriptionHistoryEvent {
  return {
    id: "evt-1",
    event_type: "created",
    effective_date: "2026-01-01",
    old_price: 0,
    new_price: 10,
    old_cycle: "",
    new_cycle: "Monthly",
    old_frequency: 0,
    new_frequency: 1,
    old_currency: "",
    new_currency: "USD",
    ...overrides,
  };
}

function getHistory(overrides: Partial<SubscriptionHistory> = {}): SubscriptionHistory {
  return {
    subscription: {
      id: "sub-1",
      name: "Netflix",
      record_type: "expense",
      currency: "USD",
      currency_symbol: "$",
      cycle: "Monthly",
      frequency: 1,
      price: 15,
    },
    events: [getEvent()],
    timeline: [{ from: "2026-01-01", price: 10, cycleName: "Monthly", frequency: 1 }],
    totals: {
      since: "2026-01-01",
      until: "2026-08-01",
      estimated_total: 80,
      estimated_payments: 8,
      last_estimated_date: "2026-08-01",
      paid_total: 0,
      paid_payments: 0,
      last_paid_date: "",
    },
    ...overrides,
  };
}

function renderDialog(sub = getSubscription()) {
  const { Wrapper } = createQueryClientWrapper();
  return render(
    <SubscriptionHistoryDialog sub={sub} userId="user-1" onClose={vi.fn()} />,
    { wrapper: Wrapper },
  );
}

describe("SubscriptionHistoryDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows a placeholder while the history is loading", () => {
    mocks.getHistory.mockReturnValue(new Promise(() => {}));

    renderDialog();

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByText("Netflix")).toBeInTheDocument();
    expect(screen.getByText("subscription_history_desc")).toBeInTheDocument();
  });

  it("reports a failed load instead of an empty history", async () => {
    mocks.getHistory.mockRejectedValue(new Error("nope"));

    renderDialog();

    expect(await screen.findByText("failed_to_load_history")).toBeInTheDocument();
  });

  it("totals what was spent and lists the changes newest first", async () => {
    mocks.getHistory.mockResolvedValue(
      getHistory({
        events: [
          getEvent(),
          getEvent({
            id: "evt-2",
            event_type: "price_changed",
            effective_date: "2026-05-01",
            old_price: 10,
            new_price: 12,
          }),
        ],
      }),
    );

    renderDialog();

    expect(await screen.findByText("total_spent")).toBeInTheDocument();
    expect(screen.getByText("80.00 $")).toBeInTheDocument();
    expect(
      screen.getByText("history_since:date(2026-01-01) · history_payments:8"),
    ).toBeInTheDocument();
    expect(screen.getByText("history_estimate_note")).toBeInTheDocument();

    const labels = screen
      .getAllByRole("listitem")
      .map((item) => item.querySelector("p")?.textContent);
    expect(labels).toEqual([
      "history_event_price_changed",
      "history_event_created",
    ]);

    // The raise renders both sides plus its percentage; the old price also
    // appears as the opening price on the created event.
    expect(screen.getAllByText("10.00 $")).toHaveLength(2);
    expect(screen.getByText("12.00 $")).toBeInTheDocument();
    expect(screen.getByText(/\+20/)).toBeInTheDocument();
    expect(screen.queryByText("confirmed_label")).not.toBeInTheDocument();
  });

  it("shows a price cut without a plus sign", async () => {
    mocks.getHistory.mockResolvedValue(
      getHistory({
        events: [
          getEvent({
            event_type: "price_changed",
            old_price: 10,
            new_price: 8,
          }),
        ],
      }),
    );

    renderDialog();

    expect(await screen.findByText(/-20/)).toBeInTheDocument();
    expect(screen.queryByText(/\+/)).not.toBeInTheDocument();
  });

  it("reports confirmed payments alongside the estimate", async () => {
    mocks.getHistory.mockResolvedValue(
      getHistory({
        totals: {
          ...getHistory().totals,
          paid_total: 45,
          paid_payments: 3,
          last_paid_date: "2026-07-01",
        },
      }),
    );

    renderDialog();

    expect(await screen.findByText("confirmed_label")).toBeInTheDocument();
    expect(screen.getByText("45.00 $")).toBeInTheDocument();
    expect(screen.getByText("history_payments:3")).toBeInTheDocument();
    expect(screen.getByText("history_confirmed_note")).toBeInTheDocument();
  });

  it("calls a credit's total what it is, and marks backfilled events", async () => {
    mocks.getHistory.mockResolvedValue(
      getHistory({
        events: [getEvent({ note: "backfilled" })],
        totals: { ...getHistory().totals, since: "" },
      }),
    );

    renderDialog(getSubscription({ record_type: "credit" }));

    expect(await screen.findByText("total_received")).toBeInTheDocument();
    // No start date to report — only the payment count is captioned.
    expect(screen.getByText("history_payments:8")).toBeInTheDocument();
    expect(
      screen.getByText("date(2026-01-01) · history_backfilled"),
    ).toBeInTheDocument();
  });

  it("falls back to a plain currency symbol and says when nothing was recorded", async () => {
    mocks.getHistory.mockResolvedValue(
      getHistory({
        events: [],
        subscription: { ...getHistory().subscription, currency_symbol: "" },
      }),
    );

    renderDialog();

    expect(await screen.findByText("no_history_yet")).toBeInTheDocument();
    expect(screen.getByText("80.00 $")).toBeInTheDocument();
  });

  it("renders cycle and currency changes as label transitions", async () => {
    mocks.getHistory.mockResolvedValue(
      getHistory({
        events: [
          getEvent({
            id: "evt-cycle",
            event_type: "cycle_changed",
            effective_date: "2026-02-01",
            old_cycle: "Monthly",
            old_frequency: 1,
            new_cycle: "Yearly",
            new_frequency: 1,
          }),
          getEvent({
            id: "evt-currency",
            event_type: "currency_changed",
            effective_date: "2026-03-01",
            old_currency: "USD",
            new_currency: "EUR",
          }),
          getEvent({
            id: "evt-paused",
            event_type: "paused",
            effective_date: "2026-04-01",
          }),
        ],
      }),
    );

    renderDialog();

    await waitFor(() => expect(screen.getByText("Yearly")).toBeInTheDocument());
    expect(screen.getByText("Monthly")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("EUR")).toBeInTheDocument();
    expect(screen.getByText("history_event_paused")).toBeInTheDocument();
  });
});
