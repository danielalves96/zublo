import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SMTPStatusCard } from "./SMTPStatusCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("SMTPStatusCard", () => {
  it("renders correctly", () => {
    render(<SMTPStatusCard enabled={true} onEnabledChange={vi.fn()} />);
    
    expect(screen.getByText("enabled")).toBeInTheDocument();
    expect(screen.getByText("smtp_enable_description")).toBeInTheDocument();
    
    const switchBtn = screen.getByRole("switch");
    expect(switchBtn).toBeChecked();
  });

  it("calls onEnabledChange when clicked", async () => {
    const onEnabledChange = vi.fn();
    render(<SMTPStatusCard enabled={false} onEnabledChange={onEnabledChange} />);
    
    const switchBtn = screen.getByRole("switch");
    expect(switchBtn).not.toBeChecked();
    
    await userEvent.click(switchBtn);
    expect(onEnabledChange).toHaveBeenCalledWith(true);
  });
});
