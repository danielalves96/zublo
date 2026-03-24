import { act, fireEvent, render, screen } from "@testing-library/react";

import { PaymentMethodsTab } from "./PaymentMethodsTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

// Mock drag-and-drop library
vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Droppable: ({ children }: { children: (provided: object, snapshot: object) => React.ReactNode }) =>
    children({ innerRef: vi.fn(), droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }: { children: (provided: object, snapshot: object) => React.ReactNode }) =>
    children(
      { innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} },
      { isDragging: false },
    ),
}));

const mockMutate = vi.fn();
let mockUseQueryData: { data: unknown[]; isLoading: boolean } = {
  data: [{ id: "pm1", name: "Visa", icon: "", user: "u1", order: 0 }],
  isLoading: false,
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => mockUseQueryData,
  useMutation: () => ({ mutate: mockMutate, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
}));

vi.mock("@/services/paymentMethods", () => ({
  paymentMethodsService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
    delete: vi.fn(),
    iconUrl: vi.fn(() => null),
    getIconUrl: vi.fn(() => null),
  },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { paymentMethods: { all: () => ["paymentMethods"] } },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

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

describe("PaymentMethodsTab", () => {
  beforeEach(() => {
    mockUseQueryData = {
      data: [{ id: "pm1", name: "Visa", icon: "", user: "u1", order: 0 }],
      isLoading: false,
    };
    mockMutate.mockClear();
    capturedConfirmProps.length = 0;
  });

  it("renders heading", () => {
    render(<PaymentMethodsTab />);
    expect(screen.getByText("payment_methods")).toBeInTheDocument();
  });

  it("renders existing payment method names", () => {
    render(<PaymentMethodsTab />);
    expect(screen.getByText("Visa")).toBeInTheDocument();
  });

  it("renders loading skeletons when isLoading is true", () => {
    mockUseQueryData = { data: [], isLoading: true };
    render(<PaymentMethodsTab />);
    const container = document.querySelector(".animate-pulse");
    expect(container).toBeInTheDocument();
  });

  it("renders empty state when no payment methods and not adding", () => {
    mockUseQueryData = { data: [], isLoading: false };
    render(<PaymentMethodsTab />);
    expect(screen.getByText("no_payment_methods")).toBeInTheDocument();
  });

  it("shows add form when add button clicked", () => {
    render(<PaymentMethodsTab />);
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByPlaceholderText("payment_method_name_placeholder")).toBeInTheDocument();
  });

  it("hides add button when isAdding is true", () => {
    render(<PaymentMethodsTab />);
    fireEvent.click(screen.getByText("add"));
    expect(screen.queryByText("add")).not.toBeInTheDocument();
  });

  it("cancels adding when cancel button clicked in form", () => {
    render(<PaymentMethodsTab />);
    fireEvent.click(screen.getByText("add"));
    const input = screen.getByPlaceholderText("payment_method_name_placeholder");
    // buttons in add form: [check, cancel] (add button is hidden)
    const formButtons = screen.getAllByRole("button");
    // Find X/cancel button - it's the second icon button in the add form
    fireEvent.click(formButtons[1]); // cancel button
    expect(screen.getByText("add")).toBeInTheDocument();
  });

  it("calls mutate when add form submitted with valid name via Enter key", () => {
    render(<PaymentMethodsTab />);
    fireEvent.click(screen.getByText("add"));
    const input = screen.getByPlaceholderText("payment_method_name_placeholder");
    fireEvent.change(input, { target: { value: "Mastercard" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockMutate).toHaveBeenCalled();
    expect((mockMutate.mock.calls[0][0] as { name: string; file: null }).name).toBe("Mastercard");
  });

  it("does not call mutate when add name is empty", () => {
    render(<PaymentMethodsTab />);
    fireEvent.click(screen.getByText("add"));
    const formButtons = screen.getAllByRole("button");
    fireEvent.click(formButtons[0]); // check button with empty input
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows edit form when edit button clicked on method list item", () => {
    render(<PaymentMethodsTab />);
    // buttons: [add, edit, delete]
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button
    expect(screen.getByDisplayValue("Visa")).toBeInTheDocument();
  });

  it("calls mutate with update args when edit submitted via Enter", () => {
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button
    const input = screen.getByDisplayValue("Visa");
    fireEvent.change(input, { target: { value: "Mastercard" } });
    fireEvent.keyDown(screen.getByDisplayValue("Mastercard"), { key: "Enter" });
    expect(mockMutate).toHaveBeenCalled();
  });

  it("does not call mutate when edit name is empty", () => {
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button
    const input = screen.getByDisplayValue("Visa");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("cancels edit when cancel button clicked", () => {
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button
    expect(screen.getByDisplayValue("Visa")).toBeInTheDocument();
    // after edit: buttons = [add, check, cancel, ...]
    const formButtons = screen.getAllByRole("button");
    // find cancel button - it's after check button in the edit row
    fireEvent.click(formButtons[2]); // cancel button (add, check, cancel)
    expect(screen.queryByDisplayValue("Visa")).not.toBeInTheDocument();
  });

  it("opens confirm dialog when delete button clicked", () => {
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // delete button (add, edit, delete)
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("calls mutate with delete id when confirm dialog confirmed", () => {
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // delete button
    const props = capturedConfirmProps[capturedConfirmProps.length - 1];
    props.onConfirm?.();
    expect(mockMutate).toHaveBeenCalledWith("pm1");
  });

  it("closes confirm dialog via onOpenChange(false)", () => {
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // delete button
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    const props = capturedConfirmProps[capturedConfirmProps.length - 1];
    act(() => {
      props.onOpenChange?.(false);
    });
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });
});
