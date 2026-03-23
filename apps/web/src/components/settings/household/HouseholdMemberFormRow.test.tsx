import { fireEvent, render, screen } from "@testing-library/react";

import { HouseholdMemberFormRow } from "./HouseholdMemberFormRow";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("HouseholdMemberFormRow", () => {
  it("renders input with current name", () => {
    render(<HouseholdMemberFormRow name="John" onCancel={vi.fn()} onNameChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByDisplayValue("John")).toBeInTheDocument();
  });

  it("calls onSubmit when check button clicked", () => {
    const onSubmit = vi.fn();
    render(<HouseholdMemberFormRow name="John" onCancel={vi.fn()} onNameChange={vi.fn()} onSubmit={onSubmit} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(onSubmit).toHaveBeenCalled();
  });
});
