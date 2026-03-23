import { render, screen } from "@testing-library/react";

import { SMTPTab } from "./SMTPTab";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({ data: {} }),
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
}));

vi.mock("@/services/admin", () => ({
  adminService: {
    getSmtp: vi.fn().mockResolvedValue({}),
    updateSmtp: vi.fn(),
    testSmtp: vi.fn(),
  },
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: { admin: { smtp: () => ["admin", "smtp"] } },
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/admin/smtp/SMTPStatusCard", () => ({
  SMTPStatusCard: ({ enabled }: { enabled: boolean }) => <div>SMTPStatusCard enabled={String(enabled)}</div>,
}));

vi.mock("@/components/admin/smtp/SMTPServerSection", () => ({
  SMTPServerSection: () => <div>SMTPServerSection</div>,
}));

vi.mock("@/components/admin/smtp/SMTPAuthSection", () => ({
  SMTPAuthSection: () => <div>SMTPAuthSection</div>,
}));

vi.mock("@/components/admin/smtp/SMTPSenderSection", () => ({
  SMTPSenderSection: () => <div>SMTPSenderSection</div>,
}));

describe("SMTPTab", () => {
  it("renders SMTP heading", () => {
    render(<SMTPTab />);
    expect(screen.getByText("SMTP")).toBeInTheDocument();
  });

  it("renders description", () => {
    render(<SMTPTab />);
    expect(screen.getByText("smtp_description")).toBeInTheDocument();
  });

  it("renders save and test buttons", () => {
    render(<SMTPTab />);
    expect(screen.getByText("save")).toBeInTheDocument();
    expect(screen.getByText("send_test_email")).toBeInTheDocument();
  });

  it("renders sub-sections", () => {
    render(<SMTPTab />);
    expect(screen.getByText("SMTPStatusCard enabled=false")).toBeInTheDocument();
    expect(screen.getByText("SMTPServerSection")).toBeInTheDocument();
    expect(screen.getByText("SMTPAuthSection")).toBeInTheDocument();
    expect(screen.getByText("SMTPSenderSection")).toBeInTheDocument();
  });
});
