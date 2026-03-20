import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { createQueryClientWrapper } from "@/test/query-client";

const mocks = vi.hoisted(() => ({
  listActiveExpanded: vi.fn(),
  listCurrencies: vi.fn(),
  listYearlyCosts: vi.fn(),
  useStatisticsDerivedData: vi.fn(),
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
    },
  }),
}));

vi.mock("@/services/subscriptions", () => ({
  subscriptionsService: {
    listActiveExpanded: mocks.listActiveExpanded,
  },
}));

vi.mock("@/services/currencies", () => ({
  currenciesService: {
    list: mocks.listCurrencies,
  },
}));

vi.mock("@/services/yearlyCosts", () => ({
  yearlyCostsService: {
    list: mocks.listYearlyCosts,
  },
}));

vi.mock("@/components/statistics/useStatisticsDerivedData", () => ({
  useStatisticsDerivedData: mocks.useStatisticsDerivedData,
}));

vi.mock("@/components/statistics/StatisticsHeader", () => ({
  StatisticsHeader: ({
    groupBy,
    onGroupByChange,
  }: {
    groupBy: string;
    onGroupByChange: (groupBy: "category" | "payment" | "member") => void;
  }) => (
    <div>
      <div>group:{groupBy}</div>
      <button type="button" onClick={() => onGroupByChange("category")}>
        category
      </button>
      <button type="button" onClick={() => onGroupByChange("payment")}>
        payment
      </button>
      <button type="button" onClick={() => onGroupByChange("member")}>
        member
      </button>
    </div>
  ),
}));

vi.mock("@/components/statistics/StatisticsSummaryCards", () => ({
  StatisticsSummaryCards: ({
    subscriptionsCount,
    totalMonthly,
  }: {
    subscriptionsCount: number;
    totalMonthly: number;
  }) => <div>summary:{subscriptionsCount}:{totalMonthly}</div>,
}));

vi.mock("@/components/statistics/StatisticsDistributionCard", () => ({
  StatisticsDistributionCard: ({
    title,
  }: {
    title: string;
  }) => <div>distribution:{title}</div>,
}));

vi.mock("@/components/statistics/StatisticsHistoryCard", () => ({
  StatisticsHistoryCard: ({ data }: { data: unknown[] }) => (
    <div>history:{data.length}</div>
  ),
}));

vi.mock("@/components/statistics/StatisticsBreakdownCard", () => ({
  StatisticsBreakdownCard: ({
    title,
  }: {
    title: string;
  }) => <div>breakdown:{title}</div>,
}));

import { StatisticsPage } from "./StatisticsPage";

describe("StatisticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listActiveExpanded.mockResolvedValue([{ id: "sub-1" }, { id: "sub-2" }]);
    mocks.listCurrencies.mockResolvedValue([{ id: "cur-1", symbol: "$" }]);
    mocks.listYearlyCosts.mockResolvedValue([{ id: "yc-1" }]);
    mocks.useStatisticsDerivedData.mockImplementation(
      ({ groupBy }: { groupBy: string }) => ({
        lineData: [{ label: groupBy }],
        mainSymbol: "$",
        pieData: [{ name: groupBy, value: 10 }],
        totalMonthly: 50,
        totalYearly: 600,
      }),
    );
  });

  it("loads statistics data and switches the grouping across the page cards", async () => {
    const { Wrapper } = createQueryClientWrapper();

    render(<StatisticsPage />, { wrapper: Wrapper });

    await waitFor(() => {
      expect(mocks.listActiveExpanded).toHaveBeenCalledWith("user-1");
    });

    await waitFor(() => {
      expect(screen.getByText((content) => content === "summary:2:50")).toBeInTheDocument();
    });
    expect(screen.getByText("distribution:cost_by_category")).toBeInTheDocument();
    expect(screen.getByText("breakdown:categories")).toBeInTheDocument();
    expect(screen.getByText("history:1")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "payment" }));
    expect(screen.getByText("distribution:cost_by_payment")).toBeInTheDocument();
    expect(screen.getByText("breakdown:payment_methods")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "member" }));
    expect(screen.getByText("distribution:cost_by_member")).toBeInTheDocument();
    expect(screen.getByText("breakdown:household")).toBeInTheDocument();
  });
});
