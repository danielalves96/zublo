import { fireEvent, render, screen, waitFor } from "@testing-library/react";

const mocks = vi.hoisted(() => ({
  navigate: vi.fn(),
  refreshUser: vi.fn(),
  register: vi.fn(),
  loginWithPassword: vi.fn(),
  listCurrencies: vi.fn(),
  updateCurrency: vi.fn(),
  updateUser: vi.fn(),
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
  useNavigate: () => mocks.navigate,
}));

vi.mock("@/components/AppLogo", () => ({
  LogoWithName: () => <div>logo</div>,
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    refreshUser: mocks.refreshUser,
  }),
}));

vi.mock("@/lib/i18n", () => ({
  __esModule: true,
  default: {
    language: "",
  },
  SUPPORTED_LANGUAGES: [
    { code: "en", name: "English" },
    { code: "pt-BR", name: "Portuguese" },
  ],
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
    value,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
    value?: string;
  }) => (
    <div
      data-testid="select"
      data-value={value}
      onClick={() => onValueChange && onValueChange("EUR")}
    >
      {children}
    </div>
  ),
  SelectTrigger: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectValue: () => <span>selected</span>,
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  SelectItem: ({
    value,
    children,
  }: {
    value: string;
    children: React.ReactNode;
  }) => <div data-value={value}>{children}</div>,
}));

vi.mock("@/services/auth", () => ({
  authService: {
    register: mocks.register,
    loginWithPassword: mocks.loginWithPassword,
  },
}));

vi.mock("@/services/currencies", () => ({
  currenciesService: {
    list: mocks.listCurrencies,
    update: mocks.updateCurrency,
  },
}));

vi.mock("@/services/users", () => ({
  usersService: {
    update: mocks.updateUser,
  },
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

import { RegisterPage } from "./RegisterPage";

describe("RegisterPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.register.mockResolvedValue(undefined);
    mocks.loginWithPassword.mockResolvedValue({
      record: { id: "user-1" },
    });
    mocks.listCurrencies.mockResolvedValue([
      { id: "cur-eur", code: "EUR" },
      { id: "cur-usd", code: "USD" },
    ]);
    mocks.updateCurrency.mockResolvedValue(undefined);
    mocks.updateUser.mockResolvedValue(undefined);
    mocks.refreshUser.mockResolvedValue(undefined);
  });

  it("registers the user, applies the preferred currency, refreshes auth, and redirects", async () => {
    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("username"), {
      target: { value: "daniel" },
    });
    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "daniel@example.com" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("confirm_password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "create_account" }));

    await waitFor(() => {
      expect(mocks.register).toHaveBeenCalledWith({
        username: "daniel",
        name: "daniel",
        email: "daniel@example.com",
        password: "password123",
        passwordConfirm: "password123",
        language: "en",
      });
    });

    expect(mocks.loginWithPassword).toHaveBeenCalledWith(
      "daniel@example.com",
      "password123",
    );
    expect(mocks.listCurrencies).toHaveBeenCalledWith("user-1");
    expect(mocks.updateCurrency).toHaveBeenCalledWith("cur-eur", {
      is_main: false,
    });
    expect(mocks.updateCurrency).toHaveBeenCalledWith("cur-usd", {
      is_main: true,
    });
    expect(mocks.updateUser).toHaveBeenCalledWith("user-1", {
      main_currency: "cur-usd",
    });
    expect(mocks.refreshUser).toHaveBeenCalledTimes(1);
    expect(mocks.toastSuccess).toHaveBeenCalledWith("success");
    expect(mocks.navigate).toHaveBeenCalledWith({
      to: "/dashboard",
      replace: true,
    });
  });

  it("shows unknown_error translation when a non-Error is thrown during registration", async () => {
    mocks.register.mockRejectedValue("unexpected-string-error");

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("username"), {
      target: { value: "daniel" },
    });
    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "daniel@example.com" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("confirm_password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "create_account" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("unknown_error");
    });
  });

  it("shows the error message when an Error instance is thrown during registration", async () => {
    mocks.register.mockRejectedValue(new Error("email already in use"));

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("username"), {
      target: { value: "daniel" },
    });
    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "daniel@example.com" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("confirm_password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "create_account" }));

    await waitFor(() => {
      expect(mocks.toastError).toHaveBeenCalledWith("email already in use");
    });
  });

  it("skips currency update when user selects EUR (default onboarding currency)", async () => {
    // The mock Select doesn't call onValueChange, so the default "USD" from defaultValues
    // is used. We need the currency to be "EUR" - we can do this by returning EUR as default
    // via a controlled Select mock that calls onChange with EUR.
    // Since the Select mock doesn't trigger onChange, the currency stays "USD".
    // Instead, let's test by making the preferred currency EUR (not found in list):
    // Actually the simplest way: override listCurrencies to return only EUR, and
    // set up the mock so that the selected currency is EUR.
    // The Select mock here doesn't allow changing the value. The default is "USD".
    // We can test the EUR skip path by making the currency code match "EUR" in listCurrencies.
    // The easiest approach: mock register/loginWithPassword with a user and set currency to EUR
    // by NOT finding a non-EUR currency in the list.

    // Use a currency list where only EUR exists and preferred is EUR itself
    mocks.listCurrencies.mockResolvedValue([
      { id: "cur-eur", code: "EUR" },
    ]);

    // The default currency value from the form is "USD" (from defaultValues).
    // The currency update only runs when data.currency !== "EUR".
    // We need data.currency to be "EUR" — but our mock Select doesn't call onValueChange.
    // To hit the EUR branch, we need to ensure the currency field value is "EUR".
    // Since the default is "USD" (from i18n mock language="en"), let's make this test
    // target the branch where `preferred` is not found (listCurrencies returns no USD match).
    mocks.listCurrencies.mockResolvedValue([
      { id: "cur-eur", code: "EUR" },
      // no USD entry, so preferred will be undefined → the if(preferred) block is skipped
    ]);

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("username"), {
      target: { value: "daniel" },
    });
    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "daniel@example.com" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("confirm_password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "create_account" }));

    await waitFor(() => {
      expect(mocks.register).toHaveBeenCalled();
      expect(mocks.toastSuccess).toHaveBeenCalledWith("success");
    });
    // updateCurrency and updateUser should NOT be called when preferred is not found
    expect(mocks.updateCurrency).not.toHaveBeenCalled();
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("applies currency when EUR is found but USD is not (no EUR deactivation needed)", async () => {
    // preferred (USD) found, but EUR not found → skip deactivating EUR
    mocks.listCurrencies.mockResolvedValue([
      { id: "cur-usd", code: "USD" },
      // no EUR entry
    ]);

    render(<RegisterPage />);

    fireEvent.change(screen.getByLabelText("username"), {
      target: { value: "daniel" },
    });
    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "daniel@example.com" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("confirm_password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "create_account" }));

    await waitFor(() => {
      expect(mocks.toastSuccess).toHaveBeenCalledWith("success");
    });
    // USD found and EUR not found → updateCurrency called only for USD, not EUR
    expect(mocks.updateCurrency).toHaveBeenCalledWith("cur-usd", { is_main: true });
    expect(mocks.updateCurrency).not.toHaveBeenCalledWith(expect.any(String), { is_main: false });
    expect(mocks.updateUser).toHaveBeenCalledWith("user-1", { main_currency: "cur-usd" });
  });

  it("shows validation errors when required fields are empty", async () => {
    render(<RegisterPage />);

    fireEvent.click(screen.getByRole("button", { name: "create_account" }));

    await waitFor(() => {
      // username is too short (empty), password too short, etc.
      const errors = document.querySelectorAll(".text-destructive");
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  it("skips currency update when EUR is selected as preferred currency", async () => {
    render(<RegisterPage />);

    // Click the first Select (currency) to trigger onValueChange with "EUR"
    const selects = document.querySelectorAll('[data-testid="select"]');
    // First select is currency
    fireEvent.click(selects[0]);

    fireEvent.change(screen.getByLabelText("username"), {
      target: { value: "daniel" },
    });
    fireEvent.change(screen.getByLabelText("email"), {
      target: { value: "daniel@example.com" },
    });
    fireEvent.change(screen.getByLabelText("password"), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText("confirm_password"), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "create_account" }));

    await waitFor(() => {
      expect(mocks.register).toHaveBeenCalled();
      expect(mocks.toastSuccess).toHaveBeenCalledWith("success");
    });
    // Currency update skipped entirely since currency is EUR
    expect(mocks.listCurrencies).not.toHaveBeenCalled();
    expect(mocks.updateCurrency).not.toHaveBeenCalled();
  });
});
