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
});
