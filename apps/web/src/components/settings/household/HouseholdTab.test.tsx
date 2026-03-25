import { act, fireEvent, render, screen } from "@testing-library/react";

import { HouseholdTab } from "./HouseholdTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

let mockAuthUser: { id?: string } | null = { id: "u1" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

const mockMutate = vi.fn();
let mockUseQueryData: { data: unknown[]; isLoading: boolean } = {
  data: [{ id: "h1", name: "John", user: "u1" }],
  isLoading: false,
};

const capturedMutOpts: Array<{
  mutationFn?: (...args: unknown[]) => unknown;
  onSuccess?: () => void;
  onError?: () => void;
}> = [];

let capturedQueryFn: (() => unknown) | undefined;

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: { queryFn?: () => unknown }) => {
    capturedQueryFn = opts.queryFn;
    return mockUseQueryData;
  },
  useMutation: (opts: {
    mutationFn?: (...args: unknown[]) => unknown;
    onSuccess?: () => void;
    onError?: () => void;
  }) => {
    capturedMutOpts.push(opts);
    return { mutate: mockMutate, isPending: false };
  },
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/services/household", () => ({
  householdService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { household: { all: () => ["household"] } },
}));

const { mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));
vi.mock("@/lib/toast", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
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

describe("HouseholdTab", () => {
  beforeEach(() => {
    mockAuthUser = { id: "u1" };
    mockUseQueryData = { data: [{ id: "h1", name: "John", user: "u1" }], isLoading: false };
    mockMutate.mockClear();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
    capturedConfirmProps.length = 0;
    capturedMutOpts.length = 0;
    capturedQueryFn = undefined;
  });

  it("renders heading", () => {
    render(<HouseholdTab />);
    expect(screen.getByText("household")).toBeInTheDocument();
  });

  it("renders existing members", () => {
    render(<HouseholdTab />);
    expect(screen.getByText("John")).toBeInTheDocument();
  });

  it("renders loading skeletons when isLoading is true", () => {
    mockUseQueryData = { data: [], isLoading: true };
    render(<HouseholdTab />);
    const container = document.querySelector(".animate-pulse");
    expect(container).toBeInTheDocument();
  });

  it("renders empty state when no members and not adding", () => {
    mockUseQueryData = { data: [], isLoading: false };
    render(<HouseholdTab />);
    expect(screen.getByText("no_household_members")).toBeInTheDocument();
  });

  it("shows add form when add button clicked", () => {
    render(<HouseholdTab />);
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByPlaceholderText("member_name_placeholder")).toBeInTheDocument();
  });

  it("hides add button when adding", () => {
    render(<HouseholdTab />);
    fireEvent.click(screen.getByText("add"));
    expect(screen.queryByText("add")).not.toBeInTheDocument();
  });

  it("cancels adding when cancel button clicked in form row", () => {
    render(<HouseholdTab />);
    fireEvent.click(screen.getByText("add"));
    const formButtons = screen.getAllByRole("button");
    // isAdding=true hides "add" button, so buttons are [check, cancel]
    fireEvent.click(formButtons[1]); // cancel button
    expect(screen.getByText("add")).toBeInTheDocument();
  });

  it("calls mutate when add form submitted with valid name", () => {
    render(<HouseholdTab />);
    fireEvent.click(screen.getByText("add"));
    const input = screen.getByPlaceholderText("member_name_placeholder");
    fireEvent.change(input, { target: { value: "Jane" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockMutate).toHaveBeenCalledWith("Jane");
  });

  it("does not call mutate when add name is empty", () => {
    render(<HouseholdTab />);
    fireEvent.click(screen.getByText("add"));
    const formButtons = screen.getAllByRole("button");
    fireEvent.click(formButtons[0]); // check button with empty input
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows edit form when edit button clicked", () => {
    render(<HouseholdTab />);
    const buttons = screen.getAllByRole("button");
    // [add, edit, delete]
    fireEvent.click(buttons[1]); // edit button
    expect(screen.getByDisplayValue("John")).toBeInTheDocument();
  });

  it("calls mutate with update args when edit submitted via Enter", () => {
    render(<HouseholdTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button
    const input = screen.getByDisplayValue("John");
    fireEvent.change(input, { target: { value: "Jane" } });
    fireEvent.keyDown(screen.getByDisplayValue("Jane"), { key: "Enter" });
    expect(mockMutate).toHaveBeenCalledWith({ id: "h1", name: "Jane" });
  });

  it("does not call mutate when edit name is empty", () => {
    render(<HouseholdTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button
    const input = screen.getByDisplayValue("John");
    fireEvent.change(input, { target: { value: "" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("cancels edit when cancel button clicked", () => {
    render(<HouseholdTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button
    expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    // after edit: buttons = [add, check, cancel]
    const formButtons = screen.getAllByRole("button");
    fireEvent.click(formButtons[2]); // cancel button
    expect(screen.queryByDisplayValue("John")).not.toBeInTheDocument();
  });

  it("opens confirm dialog when delete button clicked", () => {
    render(<HouseholdTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // delete button
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("calls mutate with delete id when confirm dialog confirmed", () => {
    render(<HouseholdTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // delete button
    const props = capturedConfirmProps[capturedConfirmProps.length - 1];
    props.onConfirm?.();
    expect(mockMutate).toHaveBeenCalledWith("h1");
  });

  it("closes confirm dialog via onOpenChange(false)", () => {
    render(<HouseholdTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // delete button
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    const props = capturedConfirmProps[capturedConfirmProps.length - 1];
    act(() => {
      props.onOpenChange?.(false);
    });
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });

  // --- mutation callback tests ---

  it("createMut onSuccess calls toast.success with success_create", () => {
    render(<HouseholdTab />);
    // createMut is index 0
    act(() => {
      capturedMutOpts[0].onSuccess?.();
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("success_create");
  });

  it("createMut onSuccess hides add form", () => {
    render(<HouseholdTab />);
    fireEvent.click(screen.getByText("add"));
    expect(screen.queryByText("add")).not.toBeInTheDocument();
    act(() => {
      capturedMutOpts[0].onSuccess?.();
    });
    expect(screen.getByText("add")).toBeInTheDocument();
  });

  it("createMut onError calls toast.error with error", () => {
    render(<HouseholdTab />);
    act(() => {
      capturedMutOpts[0].onError?.();
    });
    expect(mockToastError).toHaveBeenCalledWith("error");
  });

  it("updateMut onSuccess calls toast.success with success_update", () => {
    render(<HouseholdTab />);
    // updateMut is index 1
    act(() => {
      capturedMutOpts[1].onSuccess?.();
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("success_update");
  });

  it("updateMut onSuccess clears editingId", () => {
    render(<HouseholdTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button
    expect(screen.getByDisplayValue("John")).toBeInTheDocument();
    act(() => {
      capturedMutOpts[1].onSuccess?.();
    });
    expect(screen.queryByDisplayValue("John")).not.toBeInTheDocument();
  });

  it("updateMut onError calls toast.error with error", () => {
    render(<HouseholdTab />);
    act(() => {
      capturedMutOpts[1].onError?.();
    });
    expect(mockToastError).toHaveBeenCalledWith("error");
  });

  it("deleteMut onSuccess calls toast.success with success_delete", () => {
    render(<HouseholdTab />);
    // deleteMut is index 2
    act(() => {
      capturedMutOpts[2].onSuccess?.();
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("success_delete");
  });

  it("deleteMut onError calls toast.error with error", () => {
    render(<HouseholdTab />);
    act(() => {
      capturedMutOpts[2].onError?.();
    });
    expect(mockToastError).toHaveBeenCalledWith("error");
  });

  // --- mutationFn tests ---

  it("createMut mutationFn calls householdService.create with user id and name", async () => {
    const { householdService } = await import("@/services/household");
    render(<HouseholdTab />);
    await capturedMutOpts[0].mutationFn?.("Jane");
    expect(vi.mocked(householdService.create)).toHaveBeenCalledWith("u1", "Jane");
  });

  it("updateMut mutationFn calls householdService.update with id and name", async () => {
    const { householdService } = await import("@/services/household");
    render(<HouseholdTab />);
    await capturedMutOpts[1].mutationFn?.({ id: "h1", name: "Updated" });
    expect(vi.mocked(householdService.update)).toHaveBeenCalledWith("h1", "Updated");
  });

  it("deleteMut mutationFn calls householdService.delete with id", async () => {
    const { householdService } = await import("@/services/household");
    render(<HouseholdTab />);
    await capturedMutOpts[2].mutationFn?.("h1");
    expect(vi.mocked(householdService.delete)).toHaveBeenCalledWith("h1");
  });

  // --- queryFn test ---

  it("queryFn calls householdService.list with user id", async () => {
    const { householdService } = await import("@/services/household");
    render(<HouseholdTab />);
    await capturedQueryFn?.();
    expect(vi.mocked(householdService.list)).toHaveBeenCalledWith("u1");
  });

  it("renders without crashing when user.id is undefined (covers ?? '' fallback in queryKey)", () => {
    mockAuthUser = { id: undefined };
    render(<HouseholdTab />);
    expect(screen.getByText("household")).toBeInTheDocument();
  });

  it("onSuccess queryKey uses '' when user is null (covers ?? '' inside callbacks)", () => {
    mockAuthUser = null;
    render(<HouseholdTab />);
    act(() => { capturedMutOpts[0].onSuccess?.(); });
    act(() => { capturedMutOpts[1].onSuccess?.(); });
    act(() => { capturedMutOpts[2].onSuccess?.(); });
    expect(mockToastSuccess).toHaveBeenCalledTimes(3);
  });

  it("ConfirmDialog onOpenChange(true) does not clear pendingDeleteId", () => {
    render(<HouseholdTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // delete button → pendingDeleteId = "h1"
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    const props = capturedConfirmProps[capturedConfirmProps.length - 1];
    act(() => { props.onOpenChange?.(true); });
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("ConfirmDialog onConfirm does nothing when pendingDeleteId is null", () => {
    render(<HouseholdTab />);
    const props = capturedConfirmProps[capturedConfirmProps.length - 1];
    props.onConfirm?.();
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
