import { render, screen } from "@testing-library/react";

import { OtpDialog } from "./OtpDialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/components/ui/otp-input", () => ({
  OtpInput: (props: any) => <input data-testid="otp-input" value={props.value} onChange={(e: any) => props.onChange(e.target.value)} />,
}));

vi.mock("@/lib/toast", () => ({
  toast: { error: vi.fn() },
}));

describe("OtpDialog", () => {
  it("renders title and description when open", () => {
    render(
      <OtpDialog
        open={true}
        onClose={vi.fn()}
        title="Verify"
        description="Enter your code"
        confirmLabel="Confirm"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByText("Verify")).toBeInTheDocument();
    expect(screen.getByText("Enter your code")).toBeInTheDocument();
  });

  it("renders confirm button disabled by default", () => {
    render(
      <OtpDialog
        open={true}
        onClose={vi.fn()}
        title="Verify"
        description="Enter code"
        confirmLabel="OK"
        onConfirm={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "OK" })).toBeDisabled();
  });

  it("shows backup code toggle when allowBackup is true", () => {
    render(
      <OtpDialog
        open={true}
        onClose={vi.fn()}
        title="Verify"
        description="Enter code"
        confirmLabel="OK"
        onConfirm={vi.fn()}
        allowBackup={true}
      />,
    );
    expect(screen.getByText("use_backup_code")).toBeInTheDocument();
  });
});
