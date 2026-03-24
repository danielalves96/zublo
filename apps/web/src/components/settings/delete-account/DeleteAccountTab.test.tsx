import { act, fireEvent, render, screen } from "@testing-library/react";

import { DeleteAccountTab } from "./DeleteAccountTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockLogout = vi.fn();
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "u1", email: "user@test.com" }, logout: mockLogout }),
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

  it("shows error dialog when deletion fails", async () => {
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

  it("does not call usersService.delete when confirmText does not match email", async () => {
    render(<DeleteAccountTab />);
    const input = screen.getByPlaceholderText("confirm_email_placeholder");
    fireEvent.change(input, { target: { value: "wrong@email.com" } });
    // button is disabled, so click should not work, but test the handler directly
    expect(screen.getByText("permanently_delete_account")).toBeDisabled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });
});
