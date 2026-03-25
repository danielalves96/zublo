import { act, fireEvent, render, screen } from "@testing-library/react";

import { PaymentMethodsTab } from "./PaymentMethodsTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const { useAuthMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: useAuthMock,
}));

// Capture the onDragEnd handler so tests can invoke it directly
let capturedOnDragEnd: ((result: unknown) => void) | null = null;
let mockDraggableIsDragging = false;

vi.mock("@hello-pangea/dnd", () => ({
  DragDropContext: ({ children, onDragEnd }: { children: React.ReactNode; onDragEnd: (result: unknown) => void }) => {
    capturedOnDragEnd = onDragEnd;
    return <div>{children}</div>;
  },
  Droppable: ({ children }: { children: (provided: object, snapshot: object) => React.ReactNode }) =>
    children({ innerRef: vi.fn(), droppableProps: {}, placeholder: null }, {}),
  Draggable: ({ children }: { children: (provided: object, snapshot: object) => React.ReactNode }) =>
    children(
      { innerRef: vi.fn(), draggableProps: {}, dragHandleProps: {} },
      { isDragging: mockDraggableIsDragging },
    ),
}));

// Capture IconPicker props so tests can trigger onFileChange / onClear
type IconPickerProps = {
  currentSrc: string | null;
  hasUploadedIcon: boolean;
  onClear: () => void;
  onFileChange: (file: File, url: string) => void;
};
const capturedIconPickerProps: IconPickerProps[] = [];
vi.mock("@/components/settings/payment-methods/IconPicker", () => ({
  IconPicker: (props: IconPickerProps) => {
    capturedIconPickerProps.push(props);
    return (
      <div data-testid="icon-picker">
        <button
          data-testid="icon-picker-upload"
          onClick={() => {
            const fakeFile = new File(["img"], "icon.png", { type: "image/png" });
            props.onFileChange(fakeFile, "blob:fake-url");
          }}
        >
          upload
        </button>
        {props.hasUploadedIcon && (
          <button data-testid="icon-picker-clear" onClick={props.onClear}>
            clear
          </button>
        )}
      </div>
    );
  },
}));

vi.mock("@/components/settings/payment-methods/PaymentMethodIcon", () => ({
  PaymentMethodIcon: () => <div data-testid="payment-method-icon" />,
}));

const mockMutate = vi.fn();
const capturedMutOpts: Array<{
  mutationFn?: (...args: unknown[]) => unknown;
  onSuccess?: () => void;
  onError?: () => void;
}> = [];

let mockUseQueryData: { data: unknown[]; isLoading: boolean } = {
  data: [{ id: "pm1", name: "Visa", icon: "", user: "u1", order: 0 }],
  isLoading: false,
};
let capturedUseQueryOptions:
  | {
      queryKey?: unknown;
      queryFn?: () => unknown;
      enabled?: boolean;
    }
  | undefined;

const mockSetQueryData = vi.fn();
const mockInvalidateQueries = vi.fn();
const mockPaymentMethodsList = vi.fn();
const mockPaymentMethodsDelete = vi.fn().mockResolvedValue({});

vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: { queryKey?: unknown; queryFn?: () => unknown; enabled?: boolean }) => {
    capturedUseQueryOptions = opts;
    return mockUseQueryData;
  },
  useMutation: (opts: { mutationFn?: (...args: unknown[]) => unknown; onSuccess?: () => void; onError?: () => void }) => {
    capturedMutOpts.push(opts);
    return { mutate: mockMutate, isPending: false };
  },
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries, setQueryData: mockSetQueryData }),
}));

const mockPaymentMethodsUpdate = vi.fn().mockResolvedValue({});
const mockPaymentMethodsCreate = vi.fn().mockResolvedValue({});
const mockIconUrl = vi.fn((_method?: unknown) => null as string | null);
vi.mock("@/services/paymentMethods", () => ({
  paymentMethodsService: {
    list: (...args: unknown[]) => mockPaymentMethodsList(...args),
    create: (...args: unknown[]) => mockPaymentMethodsCreate(...args),
    update: (...args: unknown[]) => mockPaymentMethodsUpdate(...args),
    delete: (...args: unknown[]) => mockPaymentMethodsDelete(...args),
    iconUrl: (method: unknown) => mockIconUrl(method),
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

// Spy on URL.revokeObjectURL so we can assert it is called when an existing preview is cleared
const mockRevokeObjectURL = vi.fn();
Object.defineProperty(globalThis.URL, "revokeObjectURL", {
  value: mockRevokeObjectURL,
  writable: true,
});

describe("PaymentMethodsTab", () => {
  beforeEach(() => {
    useAuthMock.mockReturnValue({ user: { id: "u1" } });
    mockUseQueryData = {
      data: [{ id: "pm1", name: "Visa", icon: "", user: "u1", order: 0 }],
      isLoading: false,
    };
    capturedUseQueryOptions = undefined;
    mockMutate.mockClear();
    mockPaymentMethodsUpdate.mockClear().mockResolvedValue({});
    mockPaymentMethodsCreate.mockClear().mockResolvedValue({});
    mockPaymentMethodsList.mockClear();
    mockPaymentMethodsDelete.mockClear().mockResolvedValue({});
    mockSetQueryData.mockClear();
    mockInvalidateQueries.mockClear();
    mockRevokeObjectURL.mockClear();
    capturedConfirmProps.length = 0;
    capturedMutOpts.length = 0;
    capturedIconPickerProps.length = 0;
    capturedOnDragEnd = null;
    mockDraggableIsDragging = false;
  });

  it("renders heading", () => {
    render(<PaymentMethodsTab />);
    expect(screen.getByText("payment_methods")).toBeInTheDocument();
  });

  it("uses user id in queryFn and disables query when user is null", async () => {
    render(<PaymentMethodsTab />);
    await capturedUseQueryOptions?.queryFn?.();
    expect(capturedUseQueryOptions?.queryKey).toEqual(["paymentMethods"]);
    expect(capturedUseQueryOptions?.enabled).toBe(true);
    expect(mockPaymentMethodsList).toHaveBeenCalledWith("u1");
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

  it("calls mutate when add check button clicked with valid name", () => {
    render(<PaymentMethodsTab />);
    fireEvent.click(screen.getByText("add"));
    const input = screen.getByPlaceholderText("payment_method_name_placeholder");
    fireEvent.change(input, { target: { value: "Mastercard" } });
    const formButtons = screen.getAllByRole("button");
    fireEvent.click(formButtons[0]); // check button
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

  it("calls mutate with update args when edit check button clicked", () => {
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button
    const input = screen.getByDisplayValue("Visa");
    fireEvent.change(input, { target: { value: "Amex" } });
    // after edit: [add, check, cancel, icon-picker-upload]
    const formButtons = screen.getAllByRole("button");
    fireEvent.click(formButtons[1]); // check button in edit form
    expect(mockMutate).toHaveBeenCalled();
    const callArg = mockMutate.mock.calls[0][0] as { id: string; data: { name: string } };
    expect(callArg.id).toBe("pm1");
    expect(callArg.data.name).toBe("Amex");
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

  // --- Mutation callback tests ---

  it("createMut onSuccess: calls toast.success and resets add form", async () => {
    const { toast } = await import("@/lib/toast");
    render(<PaymentMethodsTab />);
    // Open add form
    fireEvent.click(screen.getByText("add"));
    expect(screen.getByPlaceholderText("payment_method_name_placeholder")).toBeInTheDocument();

    // capturedMutOpts[0] is createMut
    const createOpts = capturedMutOpts[0];
    act(() => {
      createOpts.onSuccess?.();
    });

    expect(toast.success).toHaveBeenCalledWith("success_create");
    // Add form should be gone, add button back
    expect(screen.queryByPlaceholderText("payment_method_name_placeholder")).not.toBeInTheDocument();
    expect(screen.getByText("add")).toBeInTheDocument();
  });

  it("createMut onError: calls toast.error", async () => {
    const { toast } = await import("@/lib/toast");
    render(<PaymentMethodsTab />);
    const createOpts = capturedMutOpts[0];
    act(() => {
      createOpts.onError?.();
    });
    expect(toast.error).toHaveBeenCalledWith("error");
  });

  it("updateMut onSuccess: calls toast.success and clears editing state", async () => {
    const { toast } = await import("@/lib/toast");
    render(<PaymentMethodsTab />);
    // Open edit form
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button
    expect(screen.getByDisplayValue("Visa")).toBeInTheDocument();

    // capturedMutOpts[1] is updateMut
    const updateOpts = capturedMutOpts[1];
    act(() => {
      updateOpts.onSuccess?.();
    });

    expect(toast.success).toHaveBeenCalledWith("success_update");
    // Edit form should be gone
    expect(screen.queryByDisplayValue("Visa")).not.toBeInTheDocument();
    expect(screen.getByText("Visa")).toBeInTheDocument();
  });

  it("updateMut onError: calls toast.error", async () => {
    const { toast } = await import("@/lib/toast");
    render(<PaymentMethodsTab />);
    const updateOpts = capturedMutOpts[1];
    act(() => {
      updateOpts.onError?.();
    });
    expect(toast.error).toHaveBeenCalledWith("error");
  });

  it("deleteMut onSuccess: calls toast.success", async () => {
    const { toast } = await import("@/lib/toast");
    render(<PaymentMethodsTab />);
    // capturedMutOpts[2] is deleteMut
    const deleteOpts = capturedMutOpts[2];
    act(() => {
      deleteOpts.onSuccess?.();
    });
    expect(toast.success).toHaveBeenCalledWith("success_delete");
  });

  it("deleteMut onError: calls toast.error", async () => {
    const { toast } = await import("@/lib/toast");
    render(<PaymentMethodsTab />);
    const deleteOpts = capturedMutOpts[2];
    act(() => {
      deleteOpts.onError?.();
    });
    expect(toast.error).toHaveBeenCalledWith("error");
  });

  it("deleteMut mutationFn calls paymentMethodsService.delete", async () => {
    render(<PaymentMethodsTab />);
    await capturedMutOpts[2].mutationFn?.("pm1");
    expect(mockPaymentMethodsDelete).toHaveBeenCalledWith("pm1");
  });

  it("mutation success callbacks still invalidate queries when user is null", () => {
    useAuthMock.mockReturnValue({ user: null });
    render(<PaymentMethodsTab />);

    act(() => {
      capturedMutOpts[0].onSuccess?.();
      capturedMutOpts[1].onSuccess?.();
      capturedMutOpts[2].onSuccess?.();
    });

    expect(mockInvalidateQueries).toHaveBeenCalledTimes(3);
  });

  // --- Icon upload / clear in add form ---

  it("add form: uploading icon sets file and preview via IconPicker onFileChange", () => {
    render(<PaymentMethodsTab />);
    fireEvent.click(screen.getByText("add"));

    // The first icon picker rendered is for the add form
    const uploadButtons = screen.getAllByTestId("icon-picker-upload");
    fireEvent.click(uploadButtons[0]);

    // After upload, hasUploadedIcon should be true → clear button appears
    expect(screen.getByTestId("icon-picker-clear")).toBeInTheDocument();
  });

  it("add form: clearing icon resets file and preview via IconPicker onClear", () => {
    render(<PaymentMethodsTab />);
    fireEvent.click(screen.getByText("add"));

    // Upload first
    const uploadButton = screen.getByTestId("icon-picker-upload");
    fireEvent.click(uploadButton);
    expect(screen.getByTestId("icon-picker-clear")).toBeInTheDocument();

    // Clear
    fireEvent.click(screen.getByTestId("icon-picker-clear"));
    expect(screen.queryByTestId("icon-picker-clear")).not.toBeInTheDocument();
  });

  it("add form: mutate receives the uploaded file when submitting", () => {
    render(<PaymentMethodsTab />);
    fireEvent.click(screen.getByText("add"));

    const input = screen.getByPlaceholderText("payment_method_name_placeholder");
    fireEvent.change(input, { target: { value: "PayPal" } });

    // Upload an icon
    fireEvent.click(screen.getByTestId("icon-picker-upload"));

    // Submit
    fireEvent.keyDown(input, { key: "Enter" });
    expect(mockMutate).toHaveBeenCalled();
    const callArg = mockMutate.mock.calls[0][0] as { name: string; file: File | null };
    expect(callArg.name).toBe("PayPal");
    expect(callArg.file).toBeInstanceOf(File);
  });

  // --- Icon upload / clear in edit form ---

  it("edit form: uploading icon via IconPicker updates editIconFile", () => {
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button

    // Find the icon picker upload button inside the edit form
    const uploadButton = screen.getByTestId("icon-picker-upload");
    fireEvent.click(uploadButton);

    // hasUploadedIcon should now be true → clear button visible
    expect(screen.getByTestId("icon-picker-clear")).toBeInTheDocument();
  });

  it("edit form: clearing icon sets editClearIcon=true (clear button disappears)", () => {
    mockUseQueryData = {
      data: [{ id: "pm1", name: "Visa", icon: "visa.png", user: "u1", order: 0 }],
      isLoading: false,
    };
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button

    // method has icon, so hasUploadedIcon is true initially — clear button visible
    expect(screen.getByTestId("icon-picker-clear")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("icon-picker-clear"));

    // After clearing, editClearIcon=true, hasUploadedIcon becomes false
    expect(screen.queryByTestId("icon-picker-clear")).not.toBeInTheDocument();
  });

  it("edit form: mutate receives _clearIcon=true when icon cleared before submit", () => {
    mockUseQueryData = {
      data: [{ id: "pm1", name: "Visa", icon: "visa.png", user: "u1", order: 0 }],
      isLoading: false,
    };
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button

    // Clear the icon
    fireEvent.click(screen.getByTestId("icon-picker-clear"));

    // Submit
    const editInput = screen.getByDisplayValue("Visa");
    fireEvent.keyDown(editInput, { key: "Enter" });

    expect(mockMutate).toHaveBeenCalled();
    const callArg = mockMutate.mock.calls[0][0] as {
      id: string;
      data: { name: string; _clearIcon: boolean; _file: File | null };
    };
    expect(callArg.id).toBe("pm1");
    expect(callArg.data._clearIcon).toBe(true);
    expect(callArg.data._file).toBeNull();
  });

  it("edit form: mutate receives _file when icon uploaded before submit", () => {
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button

    // Upload icon
    fireEvent.click(screen.getByTestId("icon-picker-upload"));

    const editInput = screen.getByDisplayValue("Visa");
    fireEvent.keyDown(editInput, { key: "Enter" });

    expect(mockMutate).toHaveBeenCalled();
    const callArg = mockMutate.mock.calls[0][0] as {
      id: string;
      data: { _file: File | null; _clearIcon: boolean };
    };
    expect(callArg.data._file).toBeInstanceOf(File);
    expect(callArg.data._clearIcon).toBe(false);
  });

  it("edit form: currentSrc falls back to iconUrl when no preview and editClearIcon is false", () => {
    mockIconUrl.mockReturnValue("https://cdn.example.com/visa.png");
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button (no preview uploaded)

    // Without an upload, editIconPreview is null → currentSrc = iconUrl(method)
    const lastProps = capturedIconPickerProps[capturedIconPickerProps.length - 1];
    expect(lastProps.currentSrc).toBe("https://cdn.example.com/visa.png");
  });

  it("edit form: hasUploadedIcon is false when method has no icon and editClearIcon is false", () => {
    // method.icon="" (falsy), editIconFile=null, editClearIcon=false → hasUploadedIcon=false
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button

    const lastProps = capturedIconPickerProps[capturedIconPickerProps.length - 1];
    expect(lastProps.hasUploadedIcon).toBe(false);
  });

  // --- updateMut mutationFn: line 103 if (_file || _clearIcon) branch ---

  it("updateMut mutationFn: uses FormData when _file is provided (line 103 true branch via _file)", async () => {
    render(<PaymentMethodsTab />);
    const fakeFile = new File(["img"], "icon.png", { type: "image/png" });
    const payload = {
      id: "pm1",
      data: { name: "Visa", _file: fakeFile, _clearIcon: false },
    };
    await capturedMutOpts[1].mutationFn?.(payload);
    expect(mockPaymentMethodsUpdate).toHaveBeenCalledWith("pm1", expect.any(FormData));
    const fd = mockPaymentMethodsUpdate.mock.calls[0][1] as FormData;
    expect(fd.get("icon")).toBe(fakeFile);
    expect(fd.get("name")).toBe("Visa");
  });

  it("updateMut mutationFn: uses FormData with icon- field when _clearIcon=true (line 109)", async () => {
    render(<PaymentMethodsTab />);
    const payload = {
      id: "pm1",
      data: { name: "Visa", _file: null, _clearIcon: true },
    };
    await capturedMutOpts[1].mutationFn?.(payload);
    expect(mockPaymentMethodsUpdate).toHaveBeenCalledWith("pm1", expect.any(FormData));
    const fd = mockPaymentMethodsUpdate.mock.calls[0][1] as FormData;
    // PocketBase uses "field-" to delete a file
    expect(fd.get("icon-")).toBe("icon");
  });

  it("updateMut mutationFn: passes plain object when neither _file nor _clearIcon (line 112 false branch)", async () => {
    render(<PaymentMethodsTab />);
    const payload = {
      id: "pm1",
      data: { name: "Visa", _file: null, _clearIcon: false },
    };
    await capturedMutOpts[1].mutationFn?.(payload);
    expect(mockPaymentMethodsUpdate).toHaveBeenCalledWith("pm1", { name: "Visa" });
  });

  it("updateMut mutationFn: uses FormData when only _clearIcon=true and _file=null (line 103 via _clearIcon)", async () => {
    render(<PaymentMethodsTab />);
    const payload = {
      id: "pm1",
      data: { name: "Amex", _file: null, _clearIcon: true },
    };
    await capturedMutOpts[1].mutationFn?.(payload);
    // _clearIcon is truthy → FormData branch taken
    expect(mockPaymentMethodsUpdate).toHaveBeenCalledWith("pm1", expect.any(FormData));
  });

  it("updateMut mutationFn: FormData skips undefined values in Object.entries loop", async () => {
    render(<PaymentMethodsTab />);
    const fakeFile = new File(["img"], "icon.png", { type: "image/png" });
    // Include an undefined field to ensure the `if (v !== undefined)` guard fires
    const payload = {
      id: "pm1",
      data: { name: "Visa", order: undefined, _file: fakeFile, _clearIcon: false },
    };
    await capturedMutOpts[1].mutationFn?.(payload);
    const fd = mockPaymentMethodsUpdate.mock.calls[0][1] as FormData;
    expect(fd.get("name")).toBe("Visa");
    // "order" was undefined so it should NOT be in FormData
    expect(fd.get("order")).toBeNull();
  });

  // --- createMut mutationFn: line 78 if (data.file) fd.append("icon", data.file) ---

  it("createMut mutationFn: appends icon to FormData when file is provided (line 78 true branch)", async () => {
    render(<PaymentMethodsTab />);
    const fakeFile = new File(["img"], "icon.png", { type: "image/png" });
    const payload = { name: "PayPal", file: fakeFile };
    await capturedMutOpts[0].mutationFn?.(payload);
    expect(mockPaymentMethodsCreate).toHaveBeenCalledWith(expect.any(FormData));
    const fd = mockPaymentMethodsCreate.mock.calls[0][0] as FormData;
    expect(fd.get("icon")).toBe(fakeFile);
    expect(fd.get("name")).toBe("PayPal");
    expect(fd.get("user")).toBe("u1");
  });

  it("createMut mutationFn: does NOT append icon when file is null (line 78 false branch)", async () => {
    render(<PaymentMethodsTab />);
    const payload = { name: "Cash", file: null };
    await capturedMutOpts[0].mutationFn?.(payload);
    expect(mockPaymentMethodsCreate).toHaveBeenCalledWith(expect.any(FormData));
    const fd = mockPaymentMethodsCreate.mock.calls[0][0] as FormData;
    expect(fd.get("icon")).toBeNull();
    expect(fd.get("name")).toBe("Cash");
  });

  // --- line 340: if (editIconPreview) URL.revokeObjectURL in edit onFileChange ---

  it("edit form onFileChange: revokes existing editIconPreview before setting new one (line 340)", () => {
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button

    // First upload sets editIconPreview to "blob:fake-url"
    const uploadBtn = screen.getByTestId("icon-picker-upload");
    fireEvent.click(uploadBtn);

    // Second upload — editIconPreview is now "blob:fake-url" (truthy), so revoke fires
    fireEvent.click(uploadBtn);

    // URL.revokeObjectURL should have been called with the previous preview URL
    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });

  // --- line 347: if (editIconPreview) URL.revokeObjectURL in edit onClear ---

  it("edit form onClear: revokes existing editIconPreview when clearing after upload (line 347)", () => {
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button

    // Upload an icon so editIconPreview = "blob:fake-url"
    const uploadBtn = screen.getByTestId("icon-picker-upload");
    fireEvent.click(uploadBtn);

    // Clear — editIconPreview is "blob:fake-url" (truthy) → revoke fires
    const clearBtn = screen.getByTestId("icon-picker-clear");
    fireEvent.click(clearBtn);

    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });

  it("edit form onClear: does NOT revoke when editIconPreview is null (line 347 false branch)", () => {
    // method has icon but no local preview uploaded — editIconPreview is null
    mockUseQueryData = {
      data: [{ id: "pm1", name: "Visa", icon: "visa.png", user: "u1", order: 0 }],
      isLoading: false,
    };
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button

    // editIconPreview is null at this point (we haven't uploaded anything)
    // The clear button is visible because method.icon is truthy
    const clearBtn = screen.getByTestId("icon-picker-clear");
    fireEvent.click(clearBtn);

    // revokeObjectURL should NOT be called (editIconPreview was null)
    expect(mockRevokeObjectURL).not.toHaveBeenCalled();
  });

  // --- line 125: resetAddForm URL.revokeObjectURL (newIconPreview) ---

  it("resetAddForm revokes newIconPreview when it is set (line 57 true branch)", () => {
    render(<PaymentMethodsTab />);
    fireEvent.click(screen.getByText("add"));

    // Upload an icon in the add form → newIconPreview = "blob:fake-url"
    fireEvent.click(screen.getByTestId("icon-picker-upload"));

    // Now cancel the add form → resetAddForm() → revoke
    const formButtons = screen.getAllByRole("button");
    fireEvent.click(formButtons[1]); // cancel button

    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });

  it("resetAddForm does NOT revoke when newIconPreview is null (line 57 false branch)", () => {
    render(<PaymentMethodsTab />);
    fireEvent.click(screen.getByText("add"));

    // No upload — newIconPreview is null
    const formButtons = screen.getAllByRole("button");
    fireEvent.click(formButtons[1]); // cancel button

    expect(mockRevokeObjectURL).not.toHaveBeenCalled();
  });

  // --- resetEditState URL.revokeObjectURL ---

  it("resetEditState revokes editIconPreview when it is set (cancel after upload)", () => {
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button

    // Upload an icon
    fireEvent.click(screen.getByTestId("icon-picker-upload"));

    // Cancel edit → resetEditState() → revoke
    const formButtons = screen.getAllByRole("button");
    fireEvent.click(formButtons[2]); // cancel button

    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });

  it("resetEditState does NOT revoke when editIconPreview is null (cancel without upload)", () => {
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[1]); // edit button

    // No upload — editIconPreview is null
    const formButtons = screen.getAllByRole("button");
    fireEvent.click(formButtons[2]); // cancel button

    expect(mockRevokeObjectURL).not.toHaveBeenCalled();
  });

  // --- add form onFileChange: if (newIconPreview) URL.revokeObjectURL (line 242) ---

  it("add form onFileChange: revokes existing newIconPreview before setting new one (line 242)", () => {
    render(<PaymentMethodsTab />);
    fireEvent.click(screen.getByText("add"));

    // First upload sets newIconPreview = "blob:fake-url"
    fireEvent.click(screen.getByTestId("icon-picker-upload"));

    // Second upload — newIconPreview is "blob:fake-url" → revoke fires
    fireEvent.click(screen.getByTestId("icon-picker-upload"));

    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });

  // --- add form onClear: if (newIconPreview) URL.revokeObjectURL (line 247) ---

  it("add form onClear: revokes newIconPreview when set (line 247 true branch)", () => {
    render(<PaymentMethodsTab />);
    fireEvent.click(screen.getByText("add"));

    // Upload → newIconPreview = "blob:fake-url"
    fireEvent.click(screen.getByTestId("icon-picker-upload"));

    // Clear → revoke fires
    fireEvent.click(screen.getByTestId("icon-picker-clear"));

    expect(mockRevokeObjectURL).toHaveBeenCalledWith("blob:fake-url");
  });

  it("add form onClear: does not revoke when preview is null", () => {
    render(<PaymentMethodsTab />);
    fireEvent.click(screen.getByText("add"));

    const addPickerProps = capturedIconPickerProps[capturedIconPickerProps.length - 1];
    act(() => {
      addPickerProps.onClear();
    });

    expect(mockRevokeObjectURL).not.toHaveBeenCalled();
  });

  // --- Drag-and-drop: handleDragEnd ---

  it("handleDragEnd: no-ops when destination is null", () => {
    render(<PaymentMethodsTab />);
    expect(capturedOnDragEnd).not.toBeNull();
    act(() => {
      capturedOnDragEnd!({ source: { index: 0 }, destination: null });
    });
    expect(mockSetQueryData).not.toHaveBeenCalled();
  });

  it("handleDragEnd: no-ops when source and destination index are the same", () => {
    render(<PaymentMethodsTab />);
    act(() => {
      capturedOnDragEnd!({ source: { index: 0 }, destination: { index: 0 } });
    });
    expect(mockSetQueryData).not.toHaveBeenCalled();
  });

  it("handleDragEnd: reorders items and calls setQueryData when indices differ", () => {
    mockUseQueryData = {
      data: [
        { id: "pm1", name: "Visa", icon: "", user: "u1", order: 0 },
        { id: "pm2", name: "Mastercard", icon: "", user: "u1", order: 1 },
      ],
      isLoading: false,
    };
    render(<PaymentMethodsTab />);
    act(() => {
      capturedOnDragEnd!({ source: { index: 0 }, destination: { index: 1 } });
    });
    expect(mockSetQueryData).toHaveBeenCalledWith(
      ["paymentMethods"],
      [
        { id: "pm2", name: "Mastercard", icon: "", user: "u1", order: 1 },
        { id: "pm1", name: "Visa", icon: "", user: "u1", order: 0 },
      ],
    );
  });

  it("handleDragEnd: calls paymentMethodsService.update for items whose order changed", async () => {
    mockUseQueryData = {
      data: [
        { id: "pm1", name: "Visa", icon: "", user: "u1", order: 0 },
        { id: "pm2", name: "Mastercard", icon: "", user: "u1", order: 1 },
      ],
      isLoading: false,
    };
    render(<PaymentMethodsTab />);
    await act(async () => {
      capturedOnDragEnd!({ source: { index: 0 }, destination: { index: 1 } });
    });
    // Both items' order values differ from new positions after swap
    expect(mockPaymentMethodsUpdate).toHaveBeenCalledWith("pm2", { order: 0 });
    expect(mockPaymentMethodsUpdate).toHaveBeenCalledWith("pm1", { order: 1 });
  });

  it("handleDragEnd: skips unchanged items and still uses fallback user key when user is null", async () => {
    mockUseQueryData = {
      data: [
        { id: "pm1", name: "Visa", icon: "", user: "u1", order: 0 },
        { id: "pm2", name: "Mastercard", icon: "", user: "u1", order: 1 },
        { id: "pm3", name: "Cash", icon: "", user: "u1", order: 2 },
      ],
      isLoading: false,
    };
    useAuthMock.mockReturnValue({ user: null });
    render(<PaymentMethodsTab />);
    await act(async () => {
      capturedOnDragEnd!({ source: { index: 0 }, destination: { index: 1 } });
    });

    expect(mockSetQueryData).toHaveBeenCalled();
    expect(mockPaymentMethodsUpdate).toHaveBeenCalledWith("pm2", { order: 0 });
    expect(mockPaymentMethodsUpdate).toHaveBeenCalledWith("pm1", { order: 1 });
    expect(mockPaymentMethodsUpdate).not.toHaveBeenCalledWith("pm3", { order: 2 });
  });

  it("handleDragEnd: calls invalidateQueries when update fails", async () => {
    mockUseQueryData = {
      data: [
        { id: "pm1", name: "Visa", icon: "", user: "u1", order: 0 },
        { id: "pm2", name: "Mastercard", icon: "", user: "u1", order: 1 },
      ],
      isLoading: false,
    };
    mockPaymentMethodsUpdate.mockRejectedValue(new Error("network fail"));
    render(<PaymentMethodsTab />);
    await act(async () => {
      capturedOnDragEnd!({ source: { index: 0 }, destination: { index: 1 } });
    });
    expect(mockInvalidateQueries).toHaveBeenCalled();
  });

  it("handleDragEnd: invalidates queries on failed reorder update when user is null", async () => {
    mockUseQueryData = {
      data: [
        { id: "pm1", name: "Visa", icon: "", user: "u1", order: 0 },
        { id: "pm2", name: "Mastercard", icon: "", user: "u1", order: 1 },
      ],
      isLoading: false,
    };
    useAuthMock.mockReturnValue({ user: null });
    mockPaymentMethodsUpdate.mockRejectedValue(new Error("network fail"));
    render(<PaymentMethodsTab />);
    await act(async () => {
      capturedOnDragEnd!({ source: { index: 0 }, destination: { index: 1 } });
    });

    expect(mockInvalidateQueries).toHaveBeenCalled();
  });

  // --- ConfirmDialog onConfirm guard when pendingDeleteId is null ---

  it("ConfirmDialog onConfirm does nothing when pendingDeleteId is null", () => {
    render(<PaymentMethodsTab />);
    const props = capturedConfirmProps[capturedConfirmProps.length - 1];
    props.onConfirm?.();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("ConfirmDialog onOpenChange(true) does not clear pendingDeleteId", () => {
    render(<PaymentMethodsTab />);
    const buttons = screen.getAllByRole("button");
    fireEvent.click(buttons[2]); // delete button
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
    const props = capturedConfirmProps[capturedConfirmProps.length - 1];
    act(() => { props.onOpenChange?.(true); });
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("captures empty query key and disabled query when user is null", () => {
    useAuthMock.mockReturnValue({ user: null });
    render(<PaymentMethodsTab />);
    expect(capturedUseQueryOptions?.queryKey).toEqual(["paymentMethods"]);
    expect(capturedUseQueryOptions?.enabled).toBe(false);
  });

  it("renders dragging styles when draggable snapshot is active", () => {
    mockDraggableIsDragging = true;
    render(<PaymentMethodsTab />);
    expect(screen.getByText("Visa").closest("div.rounded-2xl")).toHaveClass("shadow-lg");
  });
});
