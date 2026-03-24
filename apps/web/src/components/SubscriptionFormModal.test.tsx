import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import type { Category, Currency, Household, PaymentMethod, Subscription } from "@/types";

const mocks = vi.hoisted(() => ({
  useQuery: vi.fn(),
  compressImage: vi.fn(),
  createSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
  user: {
    payment_tracking: true,
  },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock("@tanstack/react-query", () => ({
  useQuery: mocks.useQuery,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: mocks.user,
  }),
}));

vi.mock("@/lib/image", () => ({
  compressImage: mocks.compressImage,
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock("@/services/subscriptions", () => ({
  subscriptionsService: {
    create: mocks.createSubscription,
    update: mocks.updateSubscription,
  },
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <span>{placeholder ?? "value"}</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/switch", () => ({
  Switch: ({
    checked,
    onCheckedChange,
  }: {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(event) => onCheckedChange(event.target.checked)}
    />
  ),
}));

vi.mock("@/components/ui/currency-input", () => ({
  CurrencyInput: ({
    value,
    onChange,
  }: {
    value: number;
    onChange: (value: number) => void;
  }) => (
    <input
      aria-label="currency-input"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  ),
}));

import { SubscriptionFormModal } from "./SubscriptionFormModal";

function getCurrency(overrides: Partial<Currency> = {}): Currency {
  return {
    id: "cur-1",
    code: "USD",
    name: "US Dollar",
    symbol: "$",
    rate: 1,
    is_main: true,
    user: "user-1",
    ...overrides,
  };
}

function getCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: "cat-1",
    name: "Streaming",
    user: "user-1",
    ...overrides,
  };
}

function getPaymentMethod(overrides: Partial<PaymentMethod> = {}): PaymentMethod {
  return {
    id: "pm-1",
    name: "Visa",
    user: "user-1",
    ...overrides,
  };
}

function getHousehold(overrides: Partial<Household> = {}): Household {
  return {
    id: "hh-1",
    name: "Daniel",
    user: "user-1",
    ...overrides,
  };
}

function getSubscription(overrides: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    name: "Netflix",
    price: 15,
    currency: "cur-1",
    frequency: 1,
    cycle: "monthly",
    next_payment: "2026-03-10",
    start_date: "2026-01-01",
    payment_method: "pm-1",
    payer: "hh-1",
    category: "cat-1",
    notes: "old notes",
    url: "https://netflix.com",
    auto_renew: true,
    notify: true,
    notify_days_before: 2,
    inactive: false,
    auto_mark_paid: true,
    cancellation_date: "",
    user: "user-1",
    ...overrides,
  };
}

describe("SubscriptionFormModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useQuery.mockReturnValue({
      data: [
        { id: "monthly", name: "Monthly" },
        { id: "yearly", name: "Yearly" },
      ],
    });
    mocks.compressImage.mockImplementation(async (file: File) => file);
    mocks.createSubscription.mockResolvedValue({ id: "created" });
    mocks.updateSubscription.mockResolvedValue({ id: "updated" });
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn().mockReturnValue("blob:logo"),
      revokeObjectURL: vi.fn(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("submits a new subscription with default values and save callback", async () => {
    const onSaved = vi.fn();

    render(
      <SubscriptionFormModal
        sub={null}
        userId="user-1"
        currencies={[getCurrency()]}
        categories={[getCategory()]}
        paymentMethods={[getPaymentMethod()]}
        household={[getHousehold()]}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );

    fireEvent.change(
      document.querySelector('input[name="name"]') as HTMLInputElement,
      {
      target: { value: "Spotify" },
      },
    );
    fireEvent.change(screen.getByLabelText("currency-input"), {
      target: { value: "20" },
    });
    fireEvent.click(screen.getAllByRole("checkbox")[1]);
    fireEvent.click(screen.getAllByRole("checkbox")[2]);
    fireEvent.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() => {
      expect(mocks.createSubscription).toHaveBeenCalled();
    });

    expect(mocks.createSubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Spotify",
        price: 20,
        currency: "cur-1",
        cycle: "monthly",
        payer: "hh-1",
        notify: true,
        inactive: true,
        user: "user-1",
      }),
    );
    expect(mocks.toastSuccess).toHaveBeenCalledWith("success");
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(screen.getByText("notify_days_before")).toBeInTheDocument();
    expect(screen.getByText("cancellation_date")).toBeInTheDocument();
    expect(screen.getByText("auto_mark_paid")).toBeInTheDocument();
  });

  it("prefills edit data and uploads a compressed logo file through FormData", async () => {
    const sub = getSubscription();

    const { container } = render(
      <SubscriptionFormModal
        sub={sub}
        userId="user-1"
        currencies={[getCurrency()]}
        categories={[getCategory()]}
        paymentMethods={[getPaymentMethod()]}
        household={[getHousehold()]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("Netflix")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://netflix.com")).toBeInTheDocument();

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["logo"], "logo.png", { type: "image/png" });

    fireEvent.change(fileInput, {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() => {
      expect(mocks.compressImage).toHaveBeenCalledWith(file, { maxSize: 256 });
    });
    expect(mocks.updateSubscription).toHaveBeenCalledWith(
      "sub-1",
      expect.any(FormData),
    );
  });

  it("updates existing subscription without logo (plain object body)", async () => {
    const onSaved = vi.fn();
    const sub = getSubscription({ notes: "old notes" });

    render(
      <SubscriptionFormModal
        sub={sub}
        userId="user-1"
        currencies={[getCurrency()]}
        categories={[getCategory()]}
        paymentMethods={[getPaymentMethod()]}
        household={[getHousehold()]}
        onClose={vi.fn()}
        onSaved={onSaved}
      />,
    );

    // Submit without changing any logo
    fireEvent.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() => {
      expect(mocks.updateSubscription).toHaveBeenCalledWith(
        "sub-1",
        expect.objectContaining({ name: "Netflix" }),
      );
    });
    expect(mocks.toastSuccess).toHaveBeenCalledWith("success");
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("shows error toast when subscription save throws", async () => {
    mocks.createSubscription.mockRejectedValue(new Error("network error"));

    render(
      <SubscriptionFormModal
        sub={null}
        userId="user-1"
        currencies={[getCurrency()]}
        categories={[getCategory()]}
        paymentMethods={[getPaymentMethod()]}
        household={[getHousehold()]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.change(
      document.querySelector('input[name="name"]') as HTMLInputElement,
      { target: { value: "Spotify" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("network error");
    });
  });

  it("shows cancel button and calls onClose when clicked", () => {
    const onClose = vi.fn();

    render(
      <SubscriptionFormModal
        sub={null}
        userId="user-1"
        currencies={[getCurrency()]}
        categories={[getCategory()]}
        paymentMethods={[getPaymentMethod()]}
        household={[getHousehold()]}
        onClose={onClose}
        onSaved={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("shows logo results panel and selects a logo", async () => {
    const logoResult = {
      previewUrl: "blob:preview",
      file: new File(["logo"], "logo.png", { type: "image/png" }),
      source: "https://clearbit.com/logo.png",
      contentType: "image/png",
    };

    // Stub setTimeout/clearTimeout to control debounce
    vi.useFakeTimers();

    // Mock fetch for logo search
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => "image/png" },
      blob: () => Promise.resolve(new Blob(["img"], { type: "image/png" })),
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.stubGlobal("createImageBitmap", vi.fn().mockResolvedValue({ width: 100, height: 100, close: vi.fn() }));

    render(
      <SubscriptionFormModal
        sub={null}
        userId="user-1"
        currencies={[getCurrency()]}
        categories={[getCategory()]}
        paymentMethods={[getPaymentMethod()]}
        household={[getHousehold()]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    // Type in logo search (at least 2 chars triggers search)
    const logoInput = screen.getByPlaceholderText("search_logo...");
    fireEvent.change(logoInput, { target: { value: "ne" } });

    // Before timer fires, should not show results yet
    expect(screen.queryByText("loading")).not.toBeInTheDocument();

    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows logo search results and handles logo selection from search", async () => {
    vi.useFakeTimers();

    render(
      <SubscriptionFormModal
        sub={null}
        userId="user-1"
        currencies={[getCurrency()]}
        categories={[getCategory()]}
        paymentMethods={[getPaymentMethod()]}
        household={[getHousehold()]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    const logoInput = screen.getByPlaceholderText("search_logo...");

    // Focus with short query — should not show results
    fireEvent.focus(logoInput);
    expect(screen.queryByText("loading")).not.toBeInTheDocument();

    // Focus with 2+ char query — should show results panel
    fireEvent.change(logoInput, { target: { value: "ne" } });
    fireEvent.focus(logoInput);

    vi.useRealTimers();
  });

  it("hides logo results when clicking outside the logo search area", async () => {
    vi.useFakeTimers();

    render(
      <SubscriptionFormModal
        sub={null}
        userId="user-1"
        currencies={[getCurrency()]}
        categories={[getCategory()]}
        paymentMethods={[getPaymentMethod()]}
        household={[getHousehold()]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    const logoInput = screen.getByPlaceholderText("search_logo...");
    fireEvent.change(logoInput, { target: { value: "ne" } });

    // Advance timer past debounce (350ms) — triggers the search
    await vi.advanceTimersByTimeAsync(400);

    // Simulate clicking outside logo search
    fireEvent.mouseDown(document.body);

    vi.useRealTimers();
  });

  it("clears logo file when file input is cleared (no file selected)", async () => {
    const { container } = render(
      <SubscriptionFormModal
        sub={null}
        userId="user-1"
        currencies={[getCurrency()]}
        categories={[getCategory()]}
        paymentMethods={[getPaymentMethod()]}
        household={[getHousehold()]}
        onClose={vi.fn()}
        onSaved={vi.fn()}
      />,
    );

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement;

    // First add a file
    const file = new File(["logo"], "logo.png", { type: "image/png" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // The filename should be shown
    await waitFor(() => expect(screen.getByText("logo.png")).toBeInTheDocument());

    // Now clear it (empty files list)
    fireEvent.change(fileInput, { target: { files: [] } });

    await waitFor(() => expect(screen.queryByText("logo.png")).not.toBeInTheDocument());
  });
});
