import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { queryKeys } from "@/lib/queryKeys";
import { createQueryClientWrapper } from "@/test/query-client";

const mocks = vi.hoisted(() => ({
  snapshot: vi.fn(),
  generate: vi.fn(),
  deleteRecommendation: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  useSummaryData: vi.fn(),
  useYearlyCosts: vi.fn(),
  useAIRecommendations: vi.fn(),
  useDashboardDerivedData: vi.fn(),
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
      name: "Daniel",
      email: "daniel@example.com",
    },
  }),
}));

vi.mock("@/hooks/useSummaryData", () => ({
  useSummaryData: mocks.useSummaryData,
}));

vi.mock("@/hooks/useYearlyCosts", () => ({
  useYearlyCosts: mocks.useYearlyCosts,
}));

vi.mock("@/hooks/useAIRecommendations", () => ({
  useAIRecommendations: mocks.useAIRecommendations,
}));

vi.mock("@/components/dashboard/useDashboardDerivedData", () => ({
  useDashboardDerivedData: mocks.useDashboardDerivedData,
}));

vi.mock("@/services/yearlyCosts", () => ({
  yearlyCostsService: {
    snapshot: mocks.snapshot,
  },
}));

vi.mock("@/services/ai", () => ({
  aiService: {
    generate: mocks.generate,
    deleteRecommendation: mocks.deleteRecommendation,
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    formatPrice: (value: number, symbol: string) => `${value} ${symbol}`,
  };
});

vi.mock("@/components/dashboard/DashboardHeader", () => ({
  DashboardHeader: ({
    userName,
    activeSubscriptions,
  }: {
    userName: string;
    activeSubscriptions: number;
  }) => (
    <div>
      {userName} / {activeSubscriptions}
    </div>
  ),
}));

vi.mock("@/components/dashboard/SummaryCard", () => ({
  SummaryCard: ({
    title,
    value,
  }: {
    title: string;
    value: string;
  }) => (
    <div>
      {title}:{value}
    </div>
  ),
}));

vi.mock("@/components/dashboard/CostHistoryCard", () => ({
  CostHistoryCard: ({ data }: { data: unknown[] }) => (
    <div>history:{data.length}</div>
  ),
}));

vi.mock("@/components/dashboard/BudgetOverviewCard", () => ({
  BudgetOverviewCard: ({ budgetUsed }: { budgetUsed: number }) => (
    <div>budget:{budgetUsed}</div>
  ),
}));

vi.mock("@/components/dashboard/AIRecommendationsCard", () => ({
  AIRecommendationsCard: ({
    recommendations,
    onGenerate,
    onDelete,
  }: {
    recommendations: unknown[];
    onGenerate: () => void;
    onDelete: (id: string) => void;
  }) => (
    <div>
      <div>recommendations:{recommendations.length}</div>
      <button type="button" onClick={onGenerate}>
        generate-recommendations
      </button>
      <button type="button" onClick={() => onDelete("rec-1")}>
        delete-recommendation
      </button>
    </div>
  ),
}));

import { DashboardPage } from "./DashboardPage";

describe("DashboardPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.snapshot.mockResolvedValue(undefined);
    mocks.generate.mockResolvedValue(undefined);
    mocks.deleteRecommendation.mockResolvedValue(undefined);
    mocks.useSummaryData.mockReturnValue({
      data: {
        count: 4,
        totalMonthly: 50,
        totalYearly: 600,
        totalWeekly: 12,
        totalDaily: 2,
        mainSymbol: "$",
      },
      isLoading: false,
    });
    mocks.useYearlyCosts.mockReturnValue({ data: [] });
    mocks.useAIRecommendations.mockReturnValue({
      data: [{ id: "rec-1" }],
      isLoading: false,
    });
    mocks.useDashboardDerivedData.mockReturnValue({
      budget: 100,
      budgetUsed: 50,
      chartData: [{ month: "Jan", value: 50 }],
      isOverBudget: false,
    });
  });

  it("renders dashboard data and triggers an initial yearly cost snapshot when empty", async () => {
    const { client, Wrapper } = createQueryClientWrapper();
    const invalidateQueries = vi
      .spyOn(client, "invalidateQueries")
      .mockResolvedValue(undefined);

    render(<DashboardPage />, { wrapper: Wrapper });

    expect(screen.getByText("Daniel / 4")).toBeInTheDocument();
    expect(screen.getByText("total_monthly:50 $")).toBeInTheDocument();
    expect(screen.getByText("total_yearly:600 $")).toBeInTheDocument();
    expect(screen.getByText("history:1")).toBeInTheDocument();
    expect(screen.getByText("budget:50")).toBeInTheDocument();

    await waitFor(() => {
      expect(mocks.snapshot).toHaveBeenCalledTimes(1);
    });
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.yearlyCosts.all("user-1"),
    });
  });

  it("generates and deletes recommendations while invalidating the recommendations query", async () => {
    const { client, Wrapper } = createQueryClientWrapper();
    const invalidateQueries = vi
      .spyOn(client, "invalidateQueries")
      .mockResolvedValue(undefined);

    render(<DashboardPage />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: "generate-recommendations" }));
    fireEvent.click(screen.getByRole("button", { name: "delete-recommendation" }));

    await waitFor(() => {
      expect(mocks.generate).toHaveBeenCalledTimes(1);
      expect(mocks.deleteRecommendation).toHaveBeenCalledWith("rec-1");
    });

    expect(mocks.toastSuccess).toHaveBeenCalledWith("success");
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: queryKeys.aiRecommendations.all("user-1"),
    });
  });

  it("calls toast.error with the error message if generate fails", async () => {
    mocks.generate.mockRejectedValue(new Error("some_error_key"));

    const { Wrapper } = createQueryClientWrapper();
    render(<DashboardPage />, { wrapper: Wrapper });

    fireEvent.click(screen.getByRole("button", { name: "generate-recommendations" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("some_error_key");
    });
  });
});
