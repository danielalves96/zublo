import { fireEvent, render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { AIRecommendationsCard } from "./AIRecommendationsCard";

const baseProps = {
  isLoading: false,
  isGenerating: false,
  onGenerate: vi.fn(),
  onDelete: vi.fn(),
};

describe("AIRecommendationsCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the card header with generate button", () => {
    render(<AIRecommendationsCard {...baseProps} />);
    expect(screen.getByText("ai_recommendations")).toBeInTheDocument();
    expect(screen.getByText("ai_smart_insights")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /generate_recommendations/i })).toBeInTheDocument();
  });

  it("shows loading state as skeleton placeholders", () => {
    const { container } = render(
      <AIRecommendationsCard {...baseProps} isLoading />,
    );
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows generating text in the button when generating", () => {
    render(<AIRecommendationsCard {...baseProps} isGenerating />);
    expect(screen.getByRole("button", { name: /loading/i })).toBeDisabled();
  });

  it("renders empty state when no recommendations", () => {
    render(<AIRecommendationsCard {...baseProps} recommendations={[]} />);
    expect(screen.getByText("no_recommendations")).toBeInTheDocument();
    expect(screen.getByText("ai_generate_hint")).toBeInTheDocument();
  });

  it("renders recommendation list with title, description and savings", () => {
    const recommendations = [
      {
        id: "r1",
        title: "Cancel Netflix",
        description: "You haven't watched in months",
        savings: "$15/mo",
      },
      {
        id: "r2",
        title: "Switch to yearly",
        description: "Save more with yearly billing",
        savings: null,
      },
    ];

    render(
      <AIRecommendationsCard {...baseProps} recommendations={recommendations} />,
    );

    expect(screen.getByText("Cancel Netflix")).toBeInTheDocument();
    expect(screen.getByText("You haven't watched in months")).toBeInTheDocument();
    expect(screen.getByText(/\$15\/mo/)).toBeInTheDocument();
    expect(screen.getByText("Switch to yearly")).toBeInTheDocument();
    expect(screen.queryByText(/savings.*null/)).not.toBeInTheDocument();
  });

  it("calls onGenerate when generate button is clicked", () => {
    const onGenerate = vi.fn();
    render(<AIRecommendationsCard {...baseProps} onGenerate={onGenerate} />);
    fireEvent.click(screen.getByRole("button", { name: /generate_recommendations/i }));
    expect(onGenerate).toHaveBeenCalledOnce();
  });

  it("calls onDelete with the recommendation id when delete is clicked", () => {
    const onDelete = vi.fn();
    render(
      <AIRecommendationsCard
        {...baseProps}
        onDelete={onDelete}
        recommendations={[
          { id: "rec-42", title: "A Rec", description: "Desc", savings: null },
        ]}
      />,
    );
    fireEvent.click(screen.getAllByRole("button")[1]);
    expect(onDelete).toHaveBeenCalledWith("rec-42");
  });
});
