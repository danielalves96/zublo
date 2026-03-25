import { act, fireEvent, render, screen } from "@testing-library/react";

import { CategoriesTab } from "./CategoriesTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

let mockAuthUser: { id?: string } | null = { id: "u1" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

const mockMutate = vi.fn();
let mockUseQueryData: { data: unknown[]; isLoading: boolean } = {
  data: [{ id: "c1", name: "Streaming", user: "u1" }],
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
  useQueryClient: () => ({ invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
}));

vi.mock("@/services/categories", () => ({
  categoriesService: { list: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { categories: { all: () => ["categories"] } },
}));

const { mockToastSuccess, mockToastError } = vi.hoisted(() => ({
  mockToastSuccess: vi.fn(),
  mockToastError: vi.fn(),
}));
vi.mock("@/lib/toast", () => ({
  toast: { success: mockToastSuccess, error: mockToastError },
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
    mockAuthUser = { id: "u1" };
    mockUseQueryData = { data: [{ id: "c1", name: "Streaming", user: "u1" }], isLoading: false };
    mockMutate.mockClear();
    mockToastSuccess.mockClear();
    mockToastError.mockClear();
    capturedConfirmProps.length = 0;
    capturedMutOpts.length = 0;
    capturedQueryFn = undefined;
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

  // --- mutation callback tests ---

  it("createMut onSuccess calls toast.success with success_create", () => {
    render(<CategoriesTab />);
    // createMut is index 0
    act(() => {
      capturedMutOpts[0].onSuccess?.();
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("success_create");
  });

  it("createMut onSuccess hides add form", () => {
    render(<CategoriesTab />);
    // open the add form first
    fireEvent.click(screen.getByText("add"));
    expect(screen.queryByText("add")).not.toBeInTheDocument();
    act(() => {
      capturedMutOpts[0].onSuccess?.();
    });
    expect(screen.getByText("add")).toBeInTheDocument();
  });

  it("createMut onError calls toast.error with error", () => {
    render(<CategoriesTab />);
    act(() => {
      capturedMutOpts[0].onError?.();
    });
    expect(mockToastError).toHaveBeenCalledWith("error");
  });

  it("updateMut onSuccess calls toast.success with success_update", () => {
    render(<CategoriesTab />);
    // updateMut is index 1
    act(() => {
      capturedMutOpts[1].onSuccess?.();
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("success_update");
  });

  it("updateMut onSuccess clears editingId", () => {
    render(<CategoriesTab />);
    // open edit form
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button
    expect(screen.getByDisplayValue("Streaming")).toBeInTheDocument();
    act(() => {
      capturedMutOpts[1].onSuccess?.();
    });
    expect(screen.queryByDisplayValue("Streaming")).not.toBeInTheDocument();
  });

  it("updateMut onError calls toast.error with error", () => {
    render(<CategoriesTab />);
    act(() => {
      capturedMutOpts[1].onError?.();
    });
    expect(mockToastError).toHaveBeenCalledWith("error");
  });

  it("deleteMut onSuccess calls toast.success with success_delete", () => {
    render(<CategoriesTab />);
    // deleteMut is index 2
    act(() => {
      capturedMutOpts[2].onSuccess?.();
    });
    expect(mockToastSuccess).toHaveBeenCalledWith("success_delete");
  });

  it("deleteMut onError calls toast.error with error", () => {
    render(<CategoriesTab />);
    act(() => {
      capturedMutOpts[2].onError?.();
    });
    expect(mockToastError).toHaveBeenCalledWith("error");
  });

  // --- mutationFn tests ---

  it("createMut mutationFn calls categoriesService.create with user id and name", async () => {
    const { categoriesService } = await import("@/services/categories");
    render(<CategoriesTab />);
    await capturedMutOpts[0].mutationFn?.("My Category");
    expect(vi.mocked(categoriesService.create)).toHaveBeenCalledWith("u1", "My Category");
  });

  it("updateMut mutationFn calls categoriesService.update with id and name", async () => {
    const { categoriesService } = await import("@/services/categories");
    render(<CategoriesTab />);
    await capturedMutOpts[1].mutationFn?.({ id: "c1", name: "Updated" });
    expect(vi.mocked(categoriesService.update)).toHaveBeenCalledWith("c1", "Updated");
  });

  it("deleteMut mutationFn calls categoriesService.delete with id", async () => {
    const { categoriesService } = await import("@/services/categories");
    render(<CategoriesTab />);
    await capturedMutOpts[2].mutationFn?.("c1");
    expect(vi.mocked(categoriesService.delete)).toHaveBeenCalledWith("c1");
  });

  // --- queryFn test ---

  it("queryFn calls categoriesService.list with user id", async () => {
    const { categoriesService } = await import("@/services/categories");
    render(<CategoriesTab />);
    await capturedQueryFn?.();
    expect(vi.mocked(categoriesService.list)).toHaveBeenCalledWith("u1");
  });

  // --- user?.id ?? "" fallback branches ---

  it("renders without crashing when user.id is undefined (covers ?? '' fallback in queryKey)", () => {
    mockAuthUser = { id: undefined };
    render(<CategoriesTab />);
    expect(screen.getByText("categories")).toBeInTheDocument();
  });

  it("onSuccess queryKey uses '' when user is null (covers ?? '' inside callbacks)", () => {
    mockAuthUser = null;
    render(<CategoriesTab />);
    act(() => { capturedMutOpts[0].onSuccess?.(); });
    act(() => { capturedMutOpts[1].onSuccess?.(); });
    act(() => { capturedMutOpts[2].onSuccess?.(); });
    // Confirms callbacks run without throwing when user is null
    expect(mockToastSuccess).toHaveBeenCalledTimes(3);
  });

  // --- ConfirmDialog branch: onOpenChange(true) is a no-op ---

  it("ConfirmDialog onOpenChange(true) does not clear pendingDeleteId", () => {
    render(<CategoriesTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // delete button → pendingDeleteId = "c1"
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    const props = capturedConfirmProps[capturedConfirmProps.length - 1];
    act(() => { props.onOpenChange?.(true); }); // true → if(!open) is false → no-op
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument(); // still open
  });

  // --- ConfirmDialog onConfirm early-return when pendingDeleteId is null ---

  it("ConfirmDialog onConfirm does nothing when pendingDeleteId is null", () => {
    render(<CategoriesTab />);
    // pendingDeleteId starts as null → onConfirm guard fires and returns
    const props = capturedConfirmProps[capturedConfirmProps.length - 1];
    props.onConfirm?.();
    expect(mockMutate).not.toHaveBeenCalled();
  });
});
