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
    language: "en",
  },
  SUPPORTED_LANGUAGES: [
    { code: "en", name: "English" },
    { code: "pt-BR", name: "Portuguese" },
  ],
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
});
