import { fireEvent, render, screen } from "@testing-library/react";

import { HouseholdMemberListItem } from "./HouseholdMemberListItem";

describe("HouseholdMemberListItem", () => {
  it("renders member name", () => {
    render(<HouseholdMemberListItem memberName="John" onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText("John")).toBeInTheDocument();
  });

  it("calls onEdit when edit button clicked", () => {
    const onEdit = vi.fn();
    render(<HouseholdMemberListItem memberName="John" onDelete={vi.fn()} onEdit={onEdit} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]);
    expect(onEdit).toHaveBeenCalled();
  });

  it("calls onDelete when delete button clicked", () => {
    const onDelete = vi.fn();
    render(<HouseholdMemberListItem memberName="John" onDelete={onDelete} onEdit={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]);
    expect(onDelete).toHaveBeenCalled();
  });
});
