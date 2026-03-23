import { render, screen } from "@testing-library/react";

import { SMTPStatusCard } from "./SMTPStatusCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("SMTPStatusCard", () => {
  it("renders enabled label", () => {
    render(<SMTPStatusCard enabled={false} onEnabledChange={vi.fn()} />);
    expect(screen.getByText("enabled")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<SMTPStatusCard enabled={false} onEnabledChange={vi.fn()} />);
    expect(screen.getByText("smtp_enable_description")).toBeInTheDocument();
  });
});
