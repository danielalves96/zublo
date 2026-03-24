import { act, fireEvent, render, screen } from "@testing-library/react";

import { CategoriesTab } from "./CategoriesTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

const mockMutate = vi.fn();
let mockUseQueryData: { data: unknown[]; isLoading: boolean } = {
  data: [{ id: "c1", name: "Streaming", user: "u1" }],
  isLoading: false,
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => mockUseQueryData,
  useMutation: () => ({ mutate: mockMutate, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
}));

vi.mock("@/services/categories", () => ({
  categoriesService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { categories: { all: () => ["categories"] } },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Capture ConfirmDialog props for each render
const capturedConfirmProps: Array<{
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirm?: () => void;
}> = [];
vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: (props: { open: boolean; onOpenChange?: (open: boolean) => void; onConfirm?: () => void }) => {
    capturedConfirmProps.push(props);
    if (props.open) {
      return <div data-testid="confirm-dialog" />;
    }
    return null;
  },
}));

describe("CategoriesTab", () => {
  beforeEach(() => {
    mockUseQueryData = { data: [{ id: "c1", name: "Streaming", user: "u1" }], isLoading: false };
    mockMutate.mockClear();
    capturedConfirmProps.length = 0;
  });

  it("renders heading", () => {
    render(<CategoriesTab />);
    expect(screen.getByText("categories")).toBeInTheDocument();
  });

  it("renders existing categories", () => {
    render(<CategoriesTab />);
    expect(screen.getByText("Streaming")).toBeInTheDocument();
  });

  it("renders loading skeletons when isLoading is true", () => {
    mockUseQueryData = { data: [], isLoading: true };
    render(<CategoriesTab />);
    const container = document.querySelector(".animate-pulse");
    expect(container).toBeInTheDocument();
  });

  it("renders empty state when no categories and not adding", () => {
    mockUseQueryData = { data: [], isLoading: false };
    render(<CategoriesTab />);
    expect(screen.getByText("no_categories")).toBeInTheDocument();
  });

  it("shows add form when add button clicked", () => {
    render(<CategoriesTab />);
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByPlaceholderText("category_name_placeholder")).toBeInTheDocument();
  });

  it("hides add button when adding", () => {
    render(<CategoriesTab />);
    fireEvent.click(screen.getByText("add"));
    expect(screen.queryByText("add")).not.toBeInTheDocument();
  });

  it("cancels adding when cancel button clicked in form row", () => {
    render(<CategoriesTab />);
    fireEvent.click(screen.getByText("add"));
    const formButtons = screen.getAllByRole("button");
    // form row: check button (0), cancel button (1)
    fireEvent.click(formButtons[1]); // cancel / X button
    expect(screen.getByText("add")).toBeInTheDocument();
  });

  it("calls mutate when add form submitted with valid name", () => {
    render(<CategoriesTab />);
    fireEvent.click(screen.getByText("add"));
    const input = screen.getByPlaceholderText("category_name_placeholder");
    fireEvent.change(input, { target: { value: "New Category" } });
    const formButtons = screen.getAllByRole("button");
    fireEvent.click(formButtons[0]); // check button
    expect(mockMutate).toHaveBeenCalledWith("New Category");
  });

  it("does not call mutate when add name is empty", () => {
    render(<CategoriesTab />);
    fireEvent.click(screen.getByText("add"));
    const formButtons = screen.getAllByRole("button");
    fireEvent.click(formButtons[0]); // check button with empty input
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("submits add form on Enter key press", () => {
    render(<CategoriesTab />);
    fireEvent.click(screen.getByText("add"));
    const input = screen.getByPlaceholderText("category_name_placeholder");
    fireEvent.change(input, { target: { value: "Keyboard Cat" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockMutate).toHaveBeenCalledWith("Keyboard Cat");
  });

  it("shows edit form when edit button clicked on category list item", () => {
    render(<CategoriesTab />);
    const buttons = screen.getAllByRole("button");
    // "add" button (0), edit button (1), delete button (2)
    fireEvent.click(buttons[1]); // edit button
    expect(screen.getByDisplayValue("Streaming")).toBeInTheDocument();
  });

  it("calls mutate with update args when edit form submitted via Enter key", () => {
    render(<CategoriesTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button
    const input = screen.getByDisplayValue("Streaming");
    fireEvent.change(input, { target: { value: "Updated" } });
    // use Enter key to submit since the input has onKeyDown handler
    fireEvent.keyDown(screen.getByDisplayValue("Updated"), { key: "Enter" });
    expect(mockMutate).toHaveBeenCalledWith({ id: "c1", name: "Updated" });
  });

  it("does not call mutate when edit name is empty", () => {
    render(<CategoriesTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button
    const input = screen.getByDisplayValue("Streaming");
    fireEvent.change(input, { target: { value: "" } });
    // press Enter to trigger submit
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("cancels edit when cancel button clicked", () => {
    render(<CategoriesTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button - shows CategoryFormRow
    // CategoryFormRow input is now visible
    expect(screen.getByDisplayValue("Streaming")).toBeInTheDocument();
    // buttons after edit: [add, check, cancel]
    const formButtons = screen.getAllByRole("button");
    fireEvent.click(formButtons[2]); // cancel/X button (index 2, after "add" button)
    // CategoryFormRow should be gone, back to CategoryListItem
    expect(screen.queryByDisplayValue("Streaming")).not.toBeInTheDocument();
  });

  it("opens confirm dialog when delete button clicked", () => {
    render(<CategoriesTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // delete button
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("calls mutate with delete id when confirm dialog confirmed", () => {
    render(<CategoriesTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // delete button
    // Get the onConfirm from the most recent ConfirmDialog render
    const lastProps = capturedConfirmProps[capturedConfirmProps.length - 1];
    lastProps.onConfirm?.();
    expect(mockMutate).toHaveBeenCalledWith("c1");
  });

  it("closes confirm dialog via onOpenChange(false)", () => {
    render(<CategoriesTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // delete button -> pendingDeleteId set
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    // Call onOpenChange(false) inside act to trigger React state update
    const props = capturedConfirmProps[capturedConfirmProps.length - 1];
    act(() => {
      props.onOpenChange?.(false);
    });
    // Dialog should disappear since pendingDeleteId is now null
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });
});
