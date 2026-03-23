import { render, screen } from "@testing-library/react";

import { BackupCodesGrid } from "./BackupCodesGrid";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn() },
}));

describe("BackupCodesGrid", () => {
  const codes = ["AAAA-1111", "BBBB-2222", "CCCC-3333"];

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
});
