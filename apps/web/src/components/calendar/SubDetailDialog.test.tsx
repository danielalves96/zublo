import { fireEvent, render, screen } from "@testing-library/react";

import type { Currency, PaymentRecord, Subscription } from "@/types";

const mocks = vi.hoisted(() => ({
  proofUrl: vi.fn(),
  getLogoUrl: vi.fn(),
  toMain: vi.fn((price: number) => price * 2),
  daysUntil: vi.fn(() => 3),
  formatDate: vi.fn(() => "Mar 10, 2026"),
  formatPrice: vi.fn((price: number, symbol: string) => `${price} ${symbol}`),
  sanitizeHref: vi.fn((href: string) => href),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/services/paymentRecords", () => ({
  paymentRecordsService: {
    proofUrl: mocks.proofUrl,
  },
}));

vi.mock("@/components/calendar/types", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/calendar/types")>();
  return {
    ...actual,
    getLogoUrl: mocks.getLogoUrl,
    toMain: mocks.toMain,
  };
});

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    daysUntil: mocks.daysUntil,
    formatDate: mocks.formatDate,
    formatPrice: mocks.formatPrice,
    sanitizeHref: mocks.sanitizeHref,
  };
});

vi.mock("./InfoRow", () => ({
  InfoRow: ({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) => (
    <div>
      <span>{label}</span>
      <div>{children}</div>
    </div>
  ),
}));

import { SubDetailDialog } from "./SubDetailDialog";

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
    url: "https://netflix.com/path",
    notes: "Some notes",
    expand: {
      currency: getCurrency(),
      cycle: { id: "monthly", name: "Monthly" },
      category: { id: "cat-1", name: "Streaming", user: "user-1" },
      payment_method: { id: "pm-1", name: "Visa", user: "user-1" },
      payer: { id: "hh-1", name: "Daniel", user: "user-1" },
    },
    ...overrides,
  };
}

describe("SubDetailDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getLogoUrl.mockReturnValue("https://cdn.example.com/netflix.png");
    mocks.proofUrl.mockReturnValue("https://cdn.example.com/proof.png");
  });

  it("renders paid details, proof, and forwards close/edit/view-payment actions", () => {
    const onClose = vi.fn();
    const onEdit = vi.fn();
    const onMarkAsPaid = vi.fn();
    const paymentRecord: PaymentRecord = {
      id: "pr-1",
      subscription_id: "sub-1",
      user: "user-1",
      due_date: "2026-03-10",
      paid_at: "2026-03-10T10:00:00Z",
      amount: 10,
    };
    const sub = getSubscription();

    render(
      <SubDetailDialog
        sub={sub}
        date={new Date("2026-03-10T00:00:00Z")}
        currencies={[getCurrency()]}
        mainCurrency={getCurrency()}
        paymentTracking
        paymentRecord={paymentRecord}
        onClose={onClose}
        onEdit={onEdit}
        onMarkAsPaid={onMarkAsPaid}
        t={(key) => key}
      />,
    );

    expect(screen.getByText("paid")).toBeInTheDocument();
    expect(screen.getByText("Streaming")).toBeInTheDocument();
    expect(screen.getByText("Visa")).toBeInTheDocument();
    expect(screen.getByText("Daniel")).toBeInTheDocument();
    expect(screen.getByText("netflix.com")).toBeInTheDocument();
    expect(screen.getByText("Some notes")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /proof/i })).toHaveAttribute(
      "href",
      "https://cdn.example.com/proof.png",
    );

    fireEvent.click(screen.getByRole("button", { name: "close" }));
    fireEvent.click(screen.getByRole("button", { name: "view_payment" }));
    fireEvent.click(screen.getByRole("button", { name: "edit" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onMarkAsPaid).toHaveBeenCalledTimes(1);
    expect(onEdit).toHaveBeenCalledWith(sub);
  });

  it("renders fallback URL text and overdue mark-as-paid state", () => {
    mocks.getLogoUrl.mockReturnValue(null);
    mocks.sanitizeHref.mockReturnValue("");
    mocks.daysUntil.mockReturnValue(-2);

    render(
      <SubDetailDialog
        sub={getSubscription({ url: "unsafe-url", inactive: true, auto_renew: false })}
        date={new Date("2026-03-01T00:00:00Z")}
        currencies={[getCurrency()]}
        mainCurrency={getCurrency()}
        paymentTracking
        paymentRecord={undefined}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onMarkAsPaid={vi.fn()}
        t={(key) => key}
      />,
    );

    expect(screen.getByText("overdue")).toBeInTheDocument();
    expect(screen.getByText("unsafe-url")).toBeInTheDocument();
    expect(screen.getByText("inactive")).toBeInTheDocument();
    expect(screen.getByText("no")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "mark_as_paid" })).toBeInTheDocument();
    expect(screen.getByText("N")).toBeInTheDocument();
  });
});
