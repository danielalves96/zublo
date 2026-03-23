import { render, screen } from "@testing-library/react";

import { FixerProviderSelect } from "./FixerProviderSelect";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("FixerProviderSelect", () => {
  it("renders provider label", () => {
    render(<FixerProviderSelect provider="fixer" onProviderChange={vi.fn()} />);
    expect(screen.getByText("fixer_provider")).toBeInTheDocument();
  });
});
