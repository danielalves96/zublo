import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { queryKeys } from "@/lib/queryKeys";
import { createQueryClientWrapper } from "@/test/query-client";

const mocks = vi.hoisted(() => ({
  listSubscriptions: vi.fn(),
  listCycles: vi.fn(),
  listCurrencies: vi.fn(),
  listCategories: vi.fn(),
  listPaymentMethods: vi.fn(),
  listHousehold: vi.fn(),
  listPaymentRecords: vi.fn(),
  useCalendarMonthData: vi.fn(),
  getPaymentRecord: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: {
      id: "user-1",
      budget: 100,
      payment_tracking: true,
    },
  }),
}));

vi.mock("@/services/subscriptions", () => ({
  subscriptionsService: {
    list: mocks.listSubscriptions,
  },
}));

vi.mock("@/services/cycles", () => ({
  cyclesService: {
    list: mocks.listCycles,
  },
}));

vi.mock("@/services/currencies", () => ({
  currenciesService: {
    list: mocks.listCurrencies,
  },
}));

vi.mock("@/services/categories", () => ({
  categoriesService: {
    list: mocks.listCategories,
  },
}));

vi.mock("@/services/paymentMethods", () => ({
  paymentMethodsService: {
    list: mocks.listPaymentMethods,
  },
}));

vi.mock("@/services/household", () => ({
  householdService: {
    list: mocks.listHousehold,
  },
}));

vi.mock("@/services/paymentRecords", () => ({
  paymentRecordsService: {
    listForUser: mocks.listPaymentRecords,
  },
}));

vi.mock("@/components/calendar/useCalendarMonthData", () => ({
  useCalendarMonthData: mocks.useCalendarMonthData,
}));

vi.mock("@/components/calendar/types", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/components/calendar/types")>();
  return {
    ...actual,
    getPaymentRecord: mocks.getPaymentRecord,
    toDateStr: (date: Date) => date.toISOString().slice(0, 10),
  };
});

vi.mock("@/lib/pb", () => ({
  default: {
    authStore: {
      token: "token-123",
    },
  },
}));

vi.mock("@/components/calendar/CalendarPageHeader", () => ({
  CalendarPageHeader: ({ onExport }: { onExport: () => void }) => (
    <button type="button" onClick={onExport}>
      export-ical
    </button>
  ),
}));

vi.mock("@/components/calendar/CalendarOverview", () => ({
  CalendarOverview: ({
    count,
    total,
  }: {
    count: number;
    total: number;
  }) => <div>overview:{count}:{total}</div>,
}));

vi.mock("@/components/calendar/CalendarMonthCard", () => ({
  CalendarMonthCard: ({
    month,
    year,
    onPrev,
    onNext,
    onGoToday,
    onSelectDay,
  }: {
    month: number;
    year: number;
    onPrev: () => void;
    onNext: () => void;
    onGoToday: () => void;
    onSelectDay: (day: number | null) => void;
  }) => (
    <div>
      <div>
        month:{month}:{year}
      </div>
      <button type="button" onClick={onPrev}>
        prev-month
      </button>
      <button type="button" onClick={onNext}>
        next-month
      </button>
      <button type="button" onClick={onGoToday}>
        today-month
      </button>
      <button type="button" onClick={() => onSelectDay(10)}>
        select-day
      </button>
    </div>
  ),
}));

vi.mock("@/components/calendar/DayPanel", () => ({
  DayPanel: ({
    day,
    onSelectEntry,
    onClose,
  }: {
    day: number;
    onSelectEntry: (entry: { sub: { id: string; name: string }; date: Date }) => void;
    onClose: () => void;
  }) => (
    <div>
      <div>day-panel:{day}</div>
      <button
        type="button"
        onClick={() =>
          onSelectEntry({
            sub: { id: "sub-1", name: "Netflix" },
            date: new Date("2026-03-10T00:00:00Z"),
          })
        }
      >
        open-detail
      </button>
      <button type="button" onClick={onClose}>
        close-day
      </button>
    </div>
  ),
}));

vi.mock("@/components/calendar/SubDetailDialog", () => ({
  SubDetailDialog: ({
    onEdit,
    onMarkAsPaid,
    onClose,
  }: {
    onEdit: (sub: { id: string; name: string }) => void;
    onMarkAsPaid: () => void;
    onClose: () => void;
  }) => (
    <div>
      <button type="button" onClick={() => onEdit({ id: "sub-1", name: "Netflix" })}>
        edit-detail
      </button>
      <button type="button" onClick={onMarkAsPaid}>
        mark-as-paid
      </button>
      <button type="button" onClick={onClose}>
        close-detail
      </button>
    </div>
  ),
}));

vi.mock("@/components/calendar/MarkAsPaidModal", () => ({
  MarkAsPaidModal: ({
    onSaved,
    onClose,
  }: {
    onSaved: () => void;
    onClose: () => void;
  }) => (
    <div>
      <button type="button" onClick={onSaved}>
        save-payment
      </button>
      <button type="button" onClick={onClose}>
        close-payment
      </button>
    </div>
  ),
}));

vi.mock("@/components/SubscriptionFormModal", () => ({
  SubscriptionFormModal: ({
    sub,
    onSaved,
    onClose,
  }: {
    sub: { name: string };
    onSaved: () => void;
    onClose: () => void;
  }) => (
    <div>
      <div>edit-form:{sub.name}</div>
      <button type="button" onClick={onSaved}>
        save-edit
      </button>
      <button type="button" onClick={onClose}>
        close-edit
      </button>
    </div>
  ),
}));

import { CalendarPage } from "./CalendarPage";

describe("CalendarPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listSubscriptions.mockResolvedValue([{ id: "sub-1", name: "Netflix" }]);
    mocks.listCycles.mockResolvedValue([{ id: "monthly" }]);
    mocks.listCurrencies.mockResolvedValue([
      { id: "cur-1", code: "USD", symbol: "$", is_main: true },
    ]);
    mocks.listCategories.mockResolvedValue([{ id: "cat-1", name: "Streaming" }]);
    mocks.listPaymentMethods.mockResolvedValue([{ id: "pm-1", name: "Visa" }]);
    mocks.listHousehold.mockResolvedValue([{ id: "hh-1", name: "Daniel" }]);
    mocks.listPaymentRecords.mockResolvedValue([
      {
        id: "pr-1",
        subscription_id: "sub-1",
        due_date: "2026-03-10",
        paid_at: "2026-03-10T10:00:00Z",
      },
    ]);
    mocks.useCalendarMonthData.mockReturnValue({
      allCells: [{ day: 10, type: "current" }],
      currencyById: new Map(),
      daysInMonth: 31,
      entriesByDay: {
        10: [
          {
            sub: { id: "sub-1", name: "Netflix" },
            date: new Date("2026-03-10T00:00:00Z"),
          },
        ],
      },
      mainCurrency: { id: "cur-1", symbol: "$" },
      selectedDayTotal: 10,
      selectedEntries: [
        {
          sub: { id: "sub-1", name: "Netflix" },
          date: new Date("2026-03-10T00:00:00Z"),
        },
      ],
      stats: {
        count: 1,
        total: 10,
        due: 1,
      },
    });
    mocks.getPaymentRecord.mockReturnValue({
      id: "pr-1",
      due_date: "2026-03-10",
      paid_at: "2026-03-10T10:00:00Z",
    });
  });

  it("exports iCal and drives day/detail/edit/payment flows with query invalidation", async () => {
    const anchorClick = vi.fn();
    const appendChild = vi.spyOn(document.body, "appendChild");
    const createElement = vi.spyOn(document, "createElement");
    createElement.mockImplementation(((tagName: string) => {
      const element = document.createElementNS("http://www.w3.org/1999/xhtml", tagName);
      if (tagName === "a") {
        Object.defineProperty(element, "click", {
          value: anchorClick,
        });
        Object.defineProperty(element, "remove", {
          value: vi.fn(),
        });
      }
      return element;
    }) as typeof document.createElement);

    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: vi.fn().mockResolvedValue(new Blob(["ics"])),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:ical"),
      revokeObjectURL: vi.fn(),
    });

    const { client, Wrapper } = createQueryClientWrapper();
    const invalidateQueries = vi
      .spyOn(client, "invalidateQueries")
      .mockResolvedValue(undefined);

    render(<CalendarPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(mocks.listSubscriptions).toHaveBeenCalledWith("user-1");
    });

    expect(screen.getByText("overview:1:10")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "export-ical" }));
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/calendar/ical", {
        headers: {
          Authorization: "Bearer token-123",
        },
      });
    });
    expect(anchorClick).toHaveBeenCalledTimes(1);
    expect(appendChild).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "select-day" }));
    expect(screen.getByText("day-panel:10")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "open-detail" }));
    fireEvent.click(screen.getByRole("button", { name: "edit-detail" }));
    expect(screen.getByText("edit-form:Netflix")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "save-edit" }));
    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.subscriptions.all("user-1"),
      });
    });

    fireEvent.click(screen.getByRole("button", { name: "open-detail" }));
    fireEvent.click(screen.getByRole("button", { name: "mark-as-paid" }));
    fireEvent.click(screen.getByRole("button", { name: "save-payment" }));

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledWith({
        queryKey: queryKeys.paymentRecords.all("user-1"),
      });
    });

    createElement.mockRestore();
    appendChild.mockRestore();
  });
});
