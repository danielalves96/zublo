import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { BackupCodesGrid } from "./BackupCodesGrid";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }));
vi.mock("@/lib/toast", () => ({
  toast: { success: toastSuccess },
}));

describe("BackupCodesGrid", () => {
  const codes = ["AAAA-1111", "BBBB-2222", "CCCC-3333"];

  beforeEach(() => {
    vi.clearAllMocks();
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } });
  });

  it("renders title", () => {
    render(<BackupCodesGrid codes={codes} title="My Codes" />);
    expect(screen.getByText("My Codes")).toBeInTheDocument();
  });

  it("renders all codes", () => {
    render(<BackupCodesGrid codes={codes} title="Codes" />);
    expect(screen.getByText("AAAA-1111")).toBeInTheDocument();
    expect(screen.getByText("BBBB-2222")).toBeInTheDocument();
    expect(screen.getByText("CCCC-3333")).toBeInTheDocument();
  });

  it("renders copy button", () => {
    render(<BackupCodesGrid codes={codes} title="Codes" />);
    expect(screen.getByText("copy")).toBeInTheDocument();
  });

  it("renders warning text", () => {
    render(<BackupCodesGrid codes={codes} title="Codes" />);
    expect(screen.getByText("backup_codes_warning")).toBeInTheDocument();
  });

  it("codes are visible by default", () => {
    render(<BackupCodesGrid codes={codes} title="Codes" />);
    const codeEl = screen.getByText("AAAA-1111");
    expect(codeEl.className).not.toContain("blur-sm");
  });

  it("hides codes when visibility toggle is clicked", () => {
    render(<BackupCodesGrid codes={codes} title="Codes" />);
    // Click the eye/eyeoff button to toggle visibility
    const buttons = screen.getAllByRole("button");
    const visibilityBtn = buttons[0]; // first button is the eye toggle
    fireEvent.click(visibilityBtn);
    const codeEl = screen.getByText("AAAA-1111");
    expect(codeEl.className).toContain("blur-sm");
  });

  it("shows codes again when visibility toggle is clicked twice", () => {
    render(<BackupCodesGrid codes={codes} title="Codes" />);
    const buttons = screen.getAllByRole("button");
    const visibilityBtn = buttons[0];
    fireEvent.click(visibilityBtn);
    fireEvent.click(visibilityBtn);
    const codeEl = screen.getByText("AAAA-1111");
    expect(codeEl.className).not.toContain("blur-sm");
  });

  it("copies all codes to clipboard when copy button is clicked", async () => {
    render(<BackupCodesGrid codes={codes} title="Codes" />);
    fireEvent.click(screen.getByText("copy"));
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(codes.join("\n"));
    });
    expect(toastSuccess).toHaveBeenCalledWith("copied");
  });
});
