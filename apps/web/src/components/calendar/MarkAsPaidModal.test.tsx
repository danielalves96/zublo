import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createQueryClientWrapper } from "@/test/query-client";
import type { PaymentRecord, Subscription } from "@/types";

const { create, update, listForSubscription, proofUrl } = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(),
  listForSubscription: vi.fn(),
  proofUrl: vi.fn(),
}));

const { subscriptionsLogoUrl } = vi.hoisted(() => ({
  subscriptionsLogoUrl: vi.fn(),
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

vi.mock("@/services/subscriptions", () => ({
  subscriptionsService: {
    logoUrl: subscriptionsLogoUrl,
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
    subscriptionsLogoUrl.mockReturnValue(null);
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

  it("falls back to the generic translated error when the mutation rejects with a non-Error value", async () => {
    create.mockRejectedValue("unexpected");
    renderComponent();

    await userEvent.click(screen.getByRole("button", { name: "confirm_payment" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("error"));
  });

  it("shows error when update returns no id", async () => {
    update.mockResolvedValue({});
    renderComponent({
      id: "rec-1",
      subscription_id: "sub-1",
      user: "user-1",
      due_date: "2026-03-20",
      amount: 45,
      notes: "",
    });

    await userEvent.click(screen.getByRole("button", { name: "confirm_payment" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Falha ao atualizar registro de pagamento"));
  });

  it("falls back to sub.price when the entered amount is invalid or zero", async () => {
    renderComponent({
      id: "rec-1",
      subscription_id: "sub-1",
      user: "user-1",
      due_date: "2026-03-20",
      amount: 45,
      notes: "",
    });

    await userEvent.clear(screen.getByLabelText("amount"));
    await userEvent.type(screen.getByLabelText("amount"), "0");
    await userEvent.click(screen.getByRole("button", { name: "confirm_payment" }));

    await waitFor(() =>
      expect(update).toHaveBeenCalledWith(
        "rec-1",
        expect.objectContaining({
          amount: sub.price,
        }),
      ),
    );
  });

  it("shows translated create failure when create returns no id", async () => {
    create.mockResolvedValue({});
    renderComponent();

    await userEvent.click(screen.getByRole("button", { name: "confirm_payment" }));

    await waitFor(() =>
      expect(toastError).toHaveBeenCalledWith("failed_create_payment_record"),
    );
  });

  it("uses sub.price as initial amount when existingRecord has no amount (line 54 false branch)", () => {
    renderComponent({
      id: "rec-1",
      subscription_id: "sub-1",
      user: "user-1",
      due_date: "2026-03-20",
      // no amount field — existingRecord.amount is undefined (nullish)
    });

    // The amount input should be pre-filled with sub.price (49.9)
    expect(screen.getByLabelText("amount")).toHaveValue(49.9);
  });

  it("shows no_proof paragraph when isViewOnly is true and proofUrl is null (line 207-214 !isViewOnly false branch)", () => {
    proofUrl.mockReturnValue(null);

    renderComponent({
      id: "rec-1",
      subscription_id: "sub-1",
      user: "user-1",
      due_date: "2026-03-20",
      paid_at: "2026-03-20T10:00:00.000Z",
      // no proof field → proofUrl returns null, isViewOnly is true
    });

    expect(screen.getByText("no_proof")).toBeInTheDocument();
    // Should not show the upload section or the proof link
    expect(screen.queryByRole("button", { name: "upload_proof" })).not.toBeInTheDocument();
  });

  it("shows saving label while mutation is pending (line 268 isPending branch)", async () => {
    // Make save never resolve so isPending stays true
    create.mockImplementation(() => new Promise(() => {}));
    renderComponent();

    await userEvent.click(screen.getByRole("button", { name: "confirm_payment" }));

    // While pending, the button label changes to t("saving")
    expect(screen.getByRole("button", { name: "saving" })).toBeInTheDocument();
  });

  it("allows clearing selected proof file and triggering file input click", async () => {
    renderComponent();
    const file = new File(["dummy"], "dummy.png", { type: "image/png" });

    // Click the placeholder to trigger click on hidden input
    const uploadButton = screen.getByRole("button", { name: "upload_proof" });
    const clickSpy = vi.spyOn(HTMLElement.prototype, "click");
    await userEvent.click(uploadButton);
    expect(clickSpy).toHaveBeenCalled();
    clickSpy.mockRestore();

    // Upload file
    await userEvent.upload(
      document.querySelector('input[type="file"]') as HTMLInputElement,
      file,
    );

    // Verify file name is shown
    expect(screen.getByText("dummy.png")).toBeInTheDocument();

    // Remove file (clear button)
    // Actually we can just find it by svg inside it or something, but let's click the button that appears besides the file name
    // It's the button inside the same div as the filename. We can find by querying all buttons and clicking the 2nd (since 1st is dialog close)
    // Actually simpler:
    const allButtons = screen.getAllByRole("button");
    // "Close", "Remove file (X)", "Confirm payment"
    // Wait, Dialog has a close button. Then we have "X" for file. Then "close" and "confirm_payment" at the bottom.
    // The "X" button for file is the only one with no text inside.
    await fireEvent.click(allButtons.find(b => b.textContent === "") || allButtons[1]);
    
    // upload_proof button should return
    expect(screen.getByRole("button", { name: "upload_proof" })).toBeInTheDocument();
  });

  it("renders the service logo and falls back to the default currency symbol when expand.currency is missing", () => {
    subscriptionsLogoUrl.mockReturnValue("https://cdn.example.com/netflix.png");
    const subWithoutExpandedCurrency: Subscription = {
      ...sub,
      expand: undefined,
    };

    const onClose = vi.fn();
    const onSaved = vi.fn();
    const { Wrapper } = createQueryClientWrapper();

    render(
      <MarkAsPaidModal
        sub={subWithoutExpandedCurrency}
        date={new Date("2026-03-20T12:00:00.000Z")}
        userId="user-1"
        existingRecord={undefined}
        onClose={onClose}
        onSaved={onSaved}
        t={(key: string) => key}
      />,
      { wrapper: Wrapper },
    );

    expect(document.querySelector("img")).toHaveAttribute(
      "src",
      "https://cdn.example.com/netflix.png",
    );
    expect(screen.getAllByText("$").length).toBeGreaterThan(0);
    expect(screen.queryByText("BRL")).not.toBeInTheDocument();
  });

  it("keeps the upload state empty when the file input change event has no files", () => {
    renderComponent();

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [] } });

    expect(screen.getByRole("button", { name: "upload_proof" })).toBeInTheDocument();
  });
});
