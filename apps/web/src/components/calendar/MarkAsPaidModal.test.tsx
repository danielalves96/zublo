import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createQueryClientWrapper } from "@/test/query-client";
import type { PaymentRecord, Subscription } from "@/types";

const { create, update, listForSubscription, proofUrl } = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  listForSubscription: vi.fn(),
  proofUrl: vi.fn(),
}));

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/services/paymentRecords", () => ({
  paymentRecordsService: {
    create,
    update,
    listForSubscription,
    proofUrl,
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

import { MarkAsPaidModal } from "./MarkAsPaidModal";

describe("MarkAsPaidModal", () => {
  const sub: Subscription = {
    id: "sub-1",
    name: "Netflix",
    price: 49.9,
    currency: "cur-1",
    frequency: 1,
    cycle: "cycle-1",
    next_payment: "2026-03-20",
    auto_renew: true,
    start_date: "2026-01-01",
    notify: true,
    notify_days_before: 3,
    inactive: false,
    user: "user-1",
    expand: {
      currency: {
        id: "cur-1",
        name: "Brazilian Real",
        code: "BRL",
        symbol: "R$",
        rate: 1,
        is_main: true,
        user: "user-1",
      },
    },
  };

  function renderComponent(existingRecord?: PaymentRecord) {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    const { Wrapper } = createQueryClientWrapper();

    const renderResult = render(
      <MarkAsPaidModal
        sub={sub}
        date={new Date("2026-03-20T12:00:00.000Z")}
        userId="user-1"
        existingRecord={existingRecord}
        onClose={onClose}
        onSaved={onSaved}
        t={(key: string) => key}
      />,
      { wrapper: Wrapper },
    );

    return { onClose, onSaved, ...renderResult };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ id: "created-1" });
    update.mockResolvedValue({ id: "updated-1" });
    listForSubscription.mockResolvedValue([]);
    proofUrl.mockReturnValue("https://example.com/proof.pdf");
  });

  it("renders a read-only payment when the record is already paid", () => {
    renderComponent({
      id: "rec-1",
      subscription_id: "sub-1",
      user: "user-1",
      due_date: "2026-03-20",
      paid_at: "2026-03-20T10:00:00.000Z",
      proof: "receipt.pdf",
      notes: "done",
    });

    expect(screen.getByText("view_payment")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /receipt\.pdf/i })).toHaveAttribute(
      "href",
      "https://example.com/proof.pdf",
    );
    expect(screen.queryByRole("button", { name: "confirm_payment" })).not.toBeInTheDocument();
  });

  it("updates the existing record and reports success", async () => {
    const { onSaved } = renderComponent({
      id: "rec-1",
      subscription_id: "sub-1",
      user: "user-1",
      due_date: "2026-03-20",
      amount: 45,
      notes: "",
    });

    await userEvent.clear(screen.getByLabelText("amount"));
    await userEvent.type(screen.getByLabelText("amount"), "52.5");
    await userEvent.type(screen.getByLabelText("notes"), "Paid manually");
    await userEvent.click(screen.getByRole("button", { name: "confirm_payment" }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        "rec-1",
        expect.objectContaining({
          subscription_id: "sub-1",
          user: "user-1",
          due_date: "2026-03-20",
          amount: 52.5,
          notes: "Paid manually",
        }),
      ),
    );
    expect(toastSuccess).toHaveBeenCalledWith("marked_as_paid");
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("reuses a matching unpaid record when no existing record is passed", async () => {
    listForSubscription.mockResolvedValue([
      {
        id: "rec-match",
        subscription_id: "sub-1",
        user: "user-1",
        due_date: "2026-03-20T00:00:00.000Z",
      },
    ]);

    renderComponent();

    await userEvent.click(screen.getByRole("button", { name: "confirm_payment" }));

    await waitFor(() => expect(listForSubscription).toHaveBeenCalledWith("sub-1", "user-1"));
    expect(update).toHaveBeenCalledWith(
      "rec-match",
      expect.objectContaining({ due_date: "2026-03-20" }),
    );
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a new record and includes the selected proof file", async () => {
    renderComponent();
    const file = new File(["proof"], "proof.png", { type: "image/png" });

    await userEvent.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      file,
    );
    await userEvent.type(screen.getByLabelText("notes"), "With receipt");
    await userEvent.click(screen.getByRole("button", { name: "confirm_payment" }));

    await waitFor(() =>
      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({
          proof: file,
          notes: "With receipt",
          due_date: "2026-03-20",
        }),
      ),
    );
  });

  it("shows the mutation error in a toast", async () => {
    create.mockRejectedValue(new Error("save failed"));
    renderComponent();

    await userEvent.click(screen.getByRole("button", { name: "confirm_payment" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("save failed"));
  });
});
