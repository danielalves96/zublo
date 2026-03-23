import { render, screen } from "@testing-library/react";

import { AIModelSelector } from "./AIModelSelector";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/lib/utils", () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(" "),
}));

describe("AIModelSelector", () => {
  it("renders model label", () => {
    render(
      <AIModelSelector
        canFetchModels={false}
        fetchingModels={false}
        model=""
        models={[]}
        onFetchModels={vi.fn()}
        onModelChange={vi.fn()}
      />,
    );
    expect(screen.getByText("model")).toBeInTheDocument();
  });

  it("renders fetch models button", () => {
    render(
      <AIModelSelector
        canFetchModels={true}
        fetchingModels={false}
        model=""
        models={[]}
        onFetchModels={vi.fn()}
        onModelChange={vi.fn()}
      />,
    );
    expect(screen.getByText("fetch_models")).toBeInTheDocument();
  });
});
