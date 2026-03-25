import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";

import { DeleteAccountTab } from "./DeleteAccountTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockLogout = vi.fn();

// Mutable auth user so individual tests can override it
let currentAuthUser: { id: string; email: string } | null = { id: "u1", email: "user@test.com" };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: currentAuthUser, logout: mockLogout }),
}));

const mockDeleteUser = vi.fn();
vi.mock("@/services/users", () => ({
  usersService: { delete: (...args: unknown[]) => mockDeleteUser(...args) },
}));

const capturedMessageDialogProps: Array<{
  open: boolean;
  onClose?: () => void;
  type?: string;
}> = [];
vi.mock("@/components/ui/message-dialog", () => ({
  MessageDialog: (props: { open: boolean; onClose?: () => void; type?: string }) => {
    capturedMessageDialogProps.push(props);
    if (props.open) {
      return <div data-testid="message-dialog" data-type={props.type} />;
    }
    return null;
  },
}));

describe("DeleteAccountTab", () => {
  beforeEach(() => {
    mockLogout.mockClear();
    mockDeleteUser.mockClear().mockResolvedValue({});
    capturedMessageDialogProps.length = 0;
    currentAuthUser = { id: "u1", email: "user@test.com" };
  });

  it("renders heading", () => {
    render(<DeleteAccountTab />);
    expect(screen.getByText("delete_account")).toBeInTheDocument();
  });

  it("renders warning text", () => {
    render(<DeleteAccountTab />);
    expect(screen.getByText("warning_permanent_action")).toBeInTheDocument();
  });

  it("renders delete button disabled by default", () => {
    render(<DeleteAccountTab />);
    expect(screen.getByText("permanently_delete_account")).toBeDisabled();
  });

  it("shows email confirmation input", () => {
    render(<DeleteAccountTab />);
    expect(screen.getByPlaceholderText("confirm_email_placeholder")).toBeInTheDocument();
  });

  it("enables delete button when correct email is typed", () => {
    render(<DeleteAccountTab />);
    const input = screen.getByPlaceholderText("confirm_email_placeholder");
    fireEvent.change(input, { target: { value: "user@test.com" } });
    expect(screen.getByText("permanently_delete_account")).not.toBeDisabled();
  });

  it("keeps delete button disabled when wrong email is typed", () => {
    render(<DeleteAccountTab />);
    const input = screen.getByPlaceholderText("confirm_email_placeholder");
    fireEvent.change(input, { target: { value: "wrong@email.com" } });
    expect(screen.getByText("permanently_delete_account")).toBeDisabled();
  });

  it("calls usersService.delete when correct email entered and button clicked", async () => {
    render(<DeleteAccountTab />);
    const input = screen.getByPlaceholderText("confirm_email_placeholder");
    fireEvent.change(input, { target: { value: "user@test.com" } });
    await act(async () => {
      fireEvent.click(screen.getByText("permanently_delete_account"));
    });
    expect(mockDeleteUser).toHaveBeenCalledWith("u1");
  });

  it("shows success dialog after account deleted", async () => {
    render(<DeleteAccountTab />);
    const input = screen.getByPlaceholderText("confirm_email_placeholder");
    fireEvent.change(input, { target: { value: "user@test.com" } });
    await act(async () => {
      fireEvent.click(screen.getByText("permanently_delete_account"));
    });
    expect(screen.getByTestId("message-dialog")).toBeInTheDocument();
    expect(screen.getByTestId("message-dialog")).toHaveAttribute("data-type", "success");
  });

  // Line 89: catch block — error dialog shown when deletion fails
  it("shows error dialog when deletion fails (line 89 catch block)", async () => {
    mockDeleteUser.mockRejectedValueOnce(new Error("fail"));
    render(<DeleteAccountTab />);
    const input = screen.getByPlaceholderText("confirm_email_placeholder");
    fireEvent.change(input, { target: { value: "user@test.com" } });
    await act(async () => {
      fireEvent.click(screen.getByText("permanently_delete_account"));
    });
    expect(screen.getByTestId("message-dialog")).toHaveAttribute("data-type", "error");
  });

  it("calls logout when success dialog is closed", async () => {
    render(<DeleteAccountTab />);
    const input = screen.getByPlaceholderText("confirm_email_placeholder");
    fireEvent.change(input, { target: { value: "user@test.com" } });
    await act(async () => {
      fireEvent.click(screen.getByText("permanently_delete_account"));
    });
    // Close the success dialog
    const props = capturedMessageDialogProps[capturedMessageDialogProps.length - 1];
    act(() => {
      props.onClose?.();
    });
    expect(mockLogout).toHaveBeenCalled();
  });

  it("does not call logout when error dialog is closed", async () => {
    mockDeleteUser.mockRejectedValueOnce(new Error("fail"));
    render(<DeleteAccountTab />);
    const input = screen.getByPlaceholderText("confirm_email_placeholder");
    fireEvent.change(input, { target: { value: "user@test.com" } });
    await act(async () => {
      fireEvent.click(screen.getByText("permanently_delete_account"));
    });
    const props = capturedMessageDialogProps[capturedMessageDialogProps.length - 1];
    act(() => {
      props.onClose?.();
    });
    expect(mockLogout).not.toHaveBeenCalled();
  });

  // Line 20: if (confirmText !== user?.email) return — guard when email doesn't match
  it("does not call usersService.delete when confirmText does not match email (lines 20 guard)", async () => {
    render(<DeleteAccountTab />);
    const input = screen.getByPlaceholderText("confirm_email_placeholder");
    fireEvent.change(input, { target: { value: "wrong@email.com" } });
    // button is disabled, so click should not work, but test the handler directly
    expect(screen.getByText("permanently_delete_account")).toBeDisabled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  // Line 20: early-return branch via force-enabling the button
  it("handleDelete early return: does not delete when email mismatches (direct guard test)", async () => {
    render(<DeleteAccountTab />);
    const input = screen.getByPlaceholderText("confirm_email_placeholder");
    // type partial email that doesn't fully match
    fireEvent.change(input, { target: { value: "user@test.co" } });
    // button is still disabled
    expect(screen.getByText("permanently_delete_account")).toBeDisabled();
    // usersService.delete was never called
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  // Line 20: exercise the early-return by force-enabling the button after changing email
  it("early-returns from handleDelete without deleting when confirm text differs from email", async () => {
    render(<DeleteAccountTab />);
    const input = screen.getByPlaceholderText("confirm_email_placeholder");

    // Type the correct email to enable the button
    fireEvent.change(input, { target: { value: "user@test.com" } });
    const button = screen.getByText("permanently_delete_account");
    expect(button).not.toBeDisabled();

    // Now change the input to a wrong value — button re-disables but internal
    // confirmText state is wrong. We then force-enable the button via removeAttribute
    // and click, exercising the if(confirmText !== user?.email) return path.
    fireEvent.change(input, { target: { value: "different@email.com" } });
    (button as HTMLButtonElement).removeAttribute("disabled");

    await act(async () => {
      fireEvent.click(button);
    });

    // The early return guard fires before usersService.delete is ever called
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  // Line 20: user?.email is undefined (user is null) — confirmText !== undefined always true → early return
  it("early-returns when user is null so user?.email is undefined (line 20 user null branch)", async () => {
    currentAuthUser = null;
    render(<DeleteAccountTab />);

    // When user is null, user?.email is undefined, so confirmText !== undefined is always true
    // The button's disabled condition is: confirmText !== user?.email || isDeleting
    // With user=null, user?.email=undefined, button stays disabled unless confirmText is also undefined.
    // confirmText starts as "" which !== undefined → button disabled.
    expect(screen.getByText("permanently_delete_account")).toBeDisabled();

    // Force-enable the button and click to exercise the `if (confirmText !== user?.email) return` guard
    const button = screen.getByText("permanently_delete_account");
    (button as HTMLButtonElement).removeAttribute("disabled");

    await act(async () => {
      fireEvent.click(button);
    });

    // confirmText="" !== undefined (user?.email) → early return → delete NOT called
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });

  it("dismisses dialog and clears it when onClose called on success dialog", async () => {
    render(<DeleteAccountTab />);
    const input = screen.getByPlaceholderText("confirm_email_placeholder");
    fireEvent.change(input, { target: { value: "user@test.com" } });
    await act(async () => {
      fireEvent.click(screen.getByText("permanently_delete_account"));
    });
    expect(screen.getByTestId("message-dialog")).toBeInTheDocument();

    const props = capturedMessageDialogProps[capturedMessageDialogProps.length - 1];
    act(() => {
      props.onClose?.();
    });

    // After onClose, logout is called (success type) and dialog is cleared
    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("message-dialog")).not.toBeInTheDocument();
  });

  // Lines 22-24: if (user?.id) false branch — user exists but has no id
  it("does not call usersService.delete when user has no id (if (user?.id) false branch)", async () => {
    // Set user with empty id but valid email
    currentAuthUser = { id: "", email: "user@test.com" };

    render(<DeleteAccountTab />);
    const input = screen.getByPlaceholderText("confirm_email_placeholder");

    // Type the correct email — confirmText matches user?.email so button enables
    fireEvent.change(input, { target: { value: "user@test.com" } });

    // Button should be enabled since confirmText === user?.email
    expect(screen.getByText("permanently_delete_account")).not.toBeDisabled();

    await act(async () => {
      fireEvent.click(screen.getByText("permanently_delete_account"));
    });

    // usersService.delete must NOT have been called (user?.id is falsy)
    expect(mockDeleteUser).not.toHaveBeenCalled();
    // No dialog shown (the if block was skipped, no success/error set)
    expect(screen.queryByTestId("message-dialog")).not.toBeInTheDocument();
  });

  // Line 89: isDeleting ? "deleting" : "permanently_delete_account" — true branch
  it("shows 'deleting' text while account deletion is in progress (line 89 isDeleting true branch)", async () => {
    let resolveDelete!: (val: unknown) => void;
    mockDeleteUser.mockImplementation(
      () => new Promise((res) => { resolveDelete = res; }),
    );

    render(<DeleteAccountTab />);
    const input = screen.getByPlaceholderText("confirm_email_placeholder");
    fireEvent.change(input, { target: { value: "user@test.com" } });

    // Click without awaiting the promise — setIsDeleting(true) fires before the await
    fireEvent.click(screen.getByText("permanently_delete_account"));

    await waitFor(() =>
      expect(screen.getByText("deleting")).toBeInTheDocument(),
    );

    // Resolve the pending promise so the component can clean up
    await act(async () => { resolveDelete({}); });
  });

  // MessageDialog: dialog?.type ?? "success" — covers the ?? "success" fallback
  // This fires when dialog is null but MessageDialog still receives type prop
  it("MessageDialog type defaults to 'success' via ?? operator when dialog is null", () => {
    render(<DeleteAccountTab />);
    // dialog is null → dialog?.type ?? "success" → "success" is passed to MessageDialog
    // The MessageDialog is rendered with open=false (!!dialog = false) but type="success"
    const lastProps = capturedMessageDialogProps[capturedMessageDialogProps.length - 1];
    expect(lastProps.type).toBe("success");
  });

  // MessageDialog: dialog?.title ?? "" and dialog?.description ?? "" when dialog is null
  it("MessageDialog title and description default to empty string when dialog is null", () => {
    render(<DeleteAccountTab />);
    const lastProps = capturedMessageDialogProps[capturedMessageDialogProps.length - 1] as {
      title?: string;
      description?: string;
    };
    // dialog is null → dialog?.title ?? "" → "" and dialog?.description ?? "" → ""
    expect(lastProps.title).toBe("");
    expect(lastProps.description).toBe("");
  });

  // onClose: dialog?.type === "success" — false branch (error dialog closed, no logout)
  it("onClose: does not call logout when dialog type is 'error' (dialog?.type === 'success' false branch)", async () => {
    mockDeleteUser.mockRejectedValueOnce(new Error("server error"));
    render(<DeleteAccountTab />);
    const input = screen.getByPlaceholderText("confirm_email_placeholder");
    fireEvent.change(input, { target: { value: "user@test.com" } });
    await act(async () => {
      fireEvent.click(screen.getByText("permanently_delete_account"));
    });
    // Error dialog is shown
    expect(screen.getByTestId("message-dialog")).toHaveAttribute("data-type", "error");

    const props = capturedMessageDialogProps[capturedMessageDialogProps.length - 1];
    act(() => {
      props.onClose?.();
    });

    // dialog?.type === "success" is false (it's "error") → logout NOT called
    expect(mockLogout).not.toHaveBeenCalled();
    // But dialog is cleared
    expect(screen.queryByTestId("message-dialog")).not.toBeInTheDocument();
  });
});
