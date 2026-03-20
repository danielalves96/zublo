import { render, screen } from "@testing-library/react";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

import { DashboardHeader } from "./DashboardHeader";

describe("DashboardHeader", () => {
  it("renders the localized heading, welcome text, and active count", () => {
    const { container } = render(
      <DashboardHeader userName="Daniel" activeSubscriptions={7} />,
    );

    expect(screen.getByText("dashboard")).toBeInTheDocument();
    expect(screen.getByText("Daniel")).toBeInTheDocument();
    expect(container).toHaveTextContent("welcome_back, Daniel. financial_overview");
    expect(container).toHaveTextContent("active_subscriptions: 7");
    expect(screen.getByText("7")).toBeInTheDocument();
  });
});
