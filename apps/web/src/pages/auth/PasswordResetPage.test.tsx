import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    to,
    children,
  }: {
    to: string;
    children: React.ReactNode;
  }) => <a href={to}>{children}</a>,
}));

vi.mock("@/services/auth", () => ({
  authService: {
    requestPasswordReset: mocks.requestPasswordReset,
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

import { PasswordResetPage } from "./PasswordResetPage";

describe("PasswordResetPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requestPasswordReset.mockResolvedValue(undefined);
  });

  it("submits the reset form, shows the sent state, and displays a success toast", async () => {
    render(<PasswordResetPage />);

    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "daniel@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "send_reset_link" }));

    await waitFor(() => {
      expect(mocks.requestPasswordReset).toHaveBeenCalledWith(
        "daniel@example.com",
      );
    });

    expect(mocks.toastSuccess).toHaveBeenCalledWith("success");
    expect(screen.getByText("reset_email_sent")).toBeInTheDocument();
  });

  it("shows unknown_error when a non-Error is thrown during password reset", async () => {
    mocks.requestPasswordReset.mockRejectedValue("not-an-error-object");

    render(<PasswordResetPage />);

    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "daniel@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "send_reset_link" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("unknown_error");
    });
  });
});
