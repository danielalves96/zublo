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

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    render(<HouseholdMemberFormRow name="John" onCancel={onCancel} onNameChange={vi.fn()} onSubmit={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // cancel button
    expect(onCancel).toHaveBeenCalled();
  });

  it("calls onNameChange when input value changes", () => {
    const onNameChange = vi.fn();
    render(<HouseholdMemberFormRow name="" onCancel={vi.fn()} onNameChange={onNameChange} onSubmit={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "Jane" } });
    expect(onNameChange).toHaveBeenCalledWith("Jane");
  });

  it("calls onSubmit when Enter key pressed", () => {
    const onSubmit = vi.fn();
    render(<HouseholdMemberFormRow name="John" onCancel={vi.fn()} onNameChange={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    expect(onSubmit).toHaveBeenCalled();
  });

  it("does not call onSubmit on non-Enter key", () => {
    const onSubmit = vi.fn();
    render(<HouseholdMemberFormRow name="John" onCancel={vi.fn()} onNameChange={vi.fn()} onSubmit={onSubmit} />);
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Escape" });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
