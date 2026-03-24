import { act, fireEvent, render, screen } from "@testing-library/react";

import { CurrenciesTab } from "./CurrenciesTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1" } }),
}));

const mockMutate = vi.fn();
let mockUseQueryData: { data: unknown[]; isLoading: boolean } = {
  data: [{ id: "cu1", name: "Dollar", symbol: "$", code: "USD", user: "u1", is_main: false }],
  isLoading: false,
};

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => mockUseQueryData,
  useMutation: () => ({ mutate: mockMutate, isPending: false }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

const mockCurrenciesUpdate = vi.fn().mockResolvedValue({});
vi.mock("@/services/currencies", () => ({
  currenciesService: { list: vi.fn(), create: vi.fn(), update: (...args: unknown[]) => mockCurrenciesUpdate(...args), delete: vi.fn() },
}));

const mockFixerUpdateRates = vi.fn().mockResolvedValue({});
vi.mock("@/services/fixer", () => ({
  fixerService: {
    getSettings: vi.fn(),
    updateRates: (...args: unknown[]) => mockFixerUpdateRates(...args),
  },
}));

const mockUsersUpdate = vi.fn().mockResolvedValue({});
vi.mock("@/services/users", () => ({
  usersService: { update: (...args: unknown[]) => mockUsersUpdate(...args) },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { currencies: { all: () => ["currencies"] } },
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

describe("CurrenciesTab", () => {
  beforeEach(() => {
    mockUseQueryData = {
      data: [{ id: "cu1", name: "Dollar", symbol: "$", code: "USD", user: "u1", is_main: false }],
      isLoading: false,
    };
    mockMutate.mockClear();
    mockCurrenciesUpdate.mockClear().mockResolvedValue({});
    mockUsersUpdate.mockClear().mockResolvedValue({});
    mockFixerUpdateRates.mockClear().mockResolvedValue({});
    capturedConfirmProps.length = 0;
  });

  it("renders heading", () => {
    render(<CurrenciesTab />);
    expect(screen.getByText("currencies")).toBeInTheDocument();
  });

  it("renders existing currencies", () => {
    render(<CurrenciesTab />);
    expect(screen.getByText("USD")).toBeInTheDocument();
  });

  it("renders loading skeletons when isLoading is true", () => {
    mockUseQueryData = { data: [], isLoading: true };
    render(<CurrenciesTab />);
    const container = document.querySelector(".animate-pulse");
    expect(container).toBeInTheDocument();
  });

  it("renders empty state when no currencies and not adding", () => {
    mockUseQueryData = { data: [], isLoading: false };
    render(<CurrenciesTab />);
    expect(screen.getByText("no_currencies")).toBeInTheDocument();
  });

  it("shows add form when add button clicked", () => {
    render(<CurrenciesTab />);
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByPlaceholderText("currency_code_placeholder")).toBeInTheDocument();
  });

  it("hides add button when adding", () => {
    render(<CurrenciesTab />);
    fireEvent.click(screen.getByText("add"));
    expect(screen.queryByText("add")).not.toBeInTheDocument();
  });

  it("cancels adding when cancel button clicked in form row", () => {
    render(<CurrenciesTab />);
    fireEvent.click(screen.getByText("add"));
    // When isAdding=true, add button is hidden; form has [check, cancel]
    const formButtons = screen.getAllByRole("button");
    fireEvent.click(formButtons[1]); // cancel button
    expect(screen.getByText("add")).toBeInTheDocument();
  });

  it("calls mutate when add form submitted with valid code via Enter", () => {
    render(<CurrenciesTab />);
    fireEvent.click(screen.getByText("add"));
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "EUR" } }); // code
    fireEvent.change(inputs[1], { target: { value: "€" } }); // symbol
    fireEvent.change(inputs[2], { target: { value: "Euro" } }); // name
    fireEvent.keyDown(inputs[2], { key: "Enter" });
    expect(mockMutate).toHaveBeenCalledWith({ code: "EUR", symbol: "€", name: "Euro" });
  });

  it("does not call mutate when add code is empty", () => {
    render(<CurrenciesTab />);
    fireEvent.click(screen.getByText("add"));
    const formButtons = screen.getAllByRole("button");
    fireEvent.click(formButtons[0]); // check button with empty inputs
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows edit form when edit button clicked on currency list item", () => {
    render(<CurrenciesTab />);
    // star(0), edit(1), delete(2) - and "add" button
    // initial buttons: [add, star, edit, delete]
    const buttons = screen.getAllByRole("button");
    // edit button is the 3rd one (index 2)
    fireEvent.click(buttons[2]); // edit button
    // edit form should show currency code
    const inputs = screen.getAllByRole("textbox");
    expect(inputs[0]).toHaveValue("USD"); // code input
  });

  it("calls mutate with update args when edit submitted via Enter", () => {
    render(<CurrenciesTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // edit button
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "GBP" } }); // code
    fireEvent.keyDown(inputs[2], { key: "Enter" }); // submit on name field
    expect(mockMutate).toHaveBeenCalledWith({ id: "cu1", data: { code: "GBP", symbol: "$", name: "Dollar" } });
  });

  it("does not call mutate when edit code is empty", () => {
    render(<CurrenciesTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // edit button
    const inputs = screen.getAllByRole("textbox");
    fireEvent.change(inputs[0], { target: { value: "" } }); // clear code
    fireEvent.keyDown(inputs[2], { key: "Enter" });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("cancels edit when cancel button clicked", () => {
    render(<CurrenciesTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // edit button
    // after edit, add button still visible since !isAdding
    // buttons: [add, check, cancel]
    const formButtons = screen.getAllByRole("button");
    fireEvent.click(formButtons[2]); // cancel button
    expect(screen.getByText("USD")).toBeInTheDocument();
  });

  it("opens confirm dialog when delete button clicked", () => {
    render(<CurrenciesTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[3]); // delete button (add, star, edit, delete)
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("calls mutate with delete id when confirm dialog confirmed", () => {
    render(<CurrenciesTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[3]); // delete button
    const props = capturedConfirmProps[capturedConfirmProps.length - 1];
    props.onConfirm?.();
    expect(mockMutate).toHaveBeenCalledWith("cu1");
  });

  it("closes confirm dialog via onOpenChange(false)", () => {
    render(<CurrenciesTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[3]); // delete button
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    const props = capturedConfirmProps[capturedConfirmProps.length - 1];
    act(() => {
      props.onOpenChange?.(false);
    });
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });

  it("calls setMainCurrency when star button clicked for non-main currency", async () => {
    const { toast } = await import("@/lib/toast");
    render(<CurrenciesTab />);
    // buttons: [add, star, edit, delete]
    const buttons = screen.getAllByRole("button");
    await act(async () => {
      fireEvent.click(buttons[1]); // star button
    });
    expect(mockCurrenciesUpdate).toHaveBeenCalledWith("cu1", { is_main: true });
    expect(mockUsersUpdate).toHaveBeenCalledWith("u1", { main_currency: "cu1" });
    expect(toast.success).toHaveBeenCalledWith("success_update");
  });

  it("shows error toast when setMainCurrency fails", async () => {
    const { toast } = await import("@/lib/toast");
    mockCurrenciesUpdate.mockRejectedValueOnce(new Error("fail"));
    render(<CurrenciesTab />);
    const buttons = screen.getAllByRole("button");
    await act(async () => {
      fireEvent.click(buttons[1]); // star button
    });
    expect(toast.error).toHaveBeenCalledWith("error");
  });

  it("renders main currency with correct styles (no edit/delete buttons)", () => {
    mockUseQueryData = {
      data: [{ id: "cu1", name: "Dollar", symbol: "$", code: "USD", user: "u1", is_main: true }],
      isLoading: false,
    };
    render(<CurrenciesTab />);
    // Main currency: star button + add button only (no edit/delete)
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2); // "add" button + star button
  });
});
