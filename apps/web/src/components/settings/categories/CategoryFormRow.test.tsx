import { fireEvent, render, screen } from "@testing-library/react";

import { CategoryFormRow } from "./CategoryFormRow";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("CategoryFormRow", () => {
  it("renders input with current name", () => {
    render(<CategoryFormRow name="Test" onCancel={vi.fn()} onNameChange={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByDisplayValue("Test")).toBeInTheDocument();
  });

  it("calls onSubmit when check button clicked", () => {
    const onSubmit = vi.fn();
    render(<CategoryFormRow name="Test" onCancel={vi.fn()} onNameChange={vi.fn()} onSubmit={onSubmit} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // check button
    expect(onSubmit).toHaveBeenCalled();
  });

  it("calls onCancel when cancel button clicked", () => {
    const onCancel = vi.fn();
    render(<CategoryFormRow name="Test" onCancel={onCancel} onNameChange={vi.fn()} onSubmit={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // cancel button
    expect(onCancel).toHaveBeenCalled();
  });
});
