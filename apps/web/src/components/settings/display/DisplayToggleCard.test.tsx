import { render, screen } from "@testing-library/react";

import { DisplayToggleCard } from "./DisplayToggleCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("DisplayToggleCard", () => {
  it("renders label and description", () => {
    render(<DisplayToggleCard checked={false} description="Toggle desc" label="Toggle label" onToggle={vi.fn()} />);
    expect(screen.getByText("Toggle label")).toBeInTheDocument();
    expect(screen.getByText("Toggle desc")).toBeInTheDocument();
  });

  it("uses fallback description when empty", () => {
    render(<DisplayToggleCard checked={false} description="" label="Toggle label" onToggle={vi.fn()} />);
    expect(screen.getByText("display_desc")).toBeInTheDocument();
  });

  it("renders switch in checked state", () => {
    render(<DisplayToggleCard checked={true} description="desc" label="label" onToggle={vi.fn()} />);
    const switchEl = screen.getByRole("switch");
    expect(switchEl).toBeInTheDocument();
  });
});
