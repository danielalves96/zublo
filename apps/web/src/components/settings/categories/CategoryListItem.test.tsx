import { fireEvent, render, screen } from "@testing-library/react";

import { CategoryListItem } from "./CategoryListItem";

describe("CategoryListItem", () => {
  it("renders category name", () => {
    render(<CategoryListItem categoryName="Streaming" onDelete={vi.fn()} onEdit={vi.fn()} />);
    expect(screen.getByText("Streaming")).toBeInTheDocument();
  });

  it("calls onEdit when edit button clicked", () => {
    const onEdit = vi.fn();
    render(<CategoryListItem categoryName="Streaming" onDelete={vi.fn()} onEdit={onEdit} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[0]); // edit button
    expect(onEdit).toHaveBeenCalled();
  });

  it("calls onDelete when delete button clicked", () => {
    const onDelete = vi.fn();
    render(<CategoryListItem categoryName="Streaming" onDelete={onDelete} onEdit={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // delete button
    expect(onDelete).toHaveBeenCalled();
  });
});
