import { render } from "@testing-library/react";

import App from "./App";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k, i18n: { language: "en" } }),
  I18nextProvider: ({ children }: any) => children,
}));

vi.mock("@/contexts/AuthContext", () => ({
  AuthProvider: ({ children }: any) => <div>{children}</div>,
  useAuth: () => ({ user: null, isLoading: true, isAdmin: false }),
}));

vi.mock("@/components/AppMetadata", () => ({
  AppMetadata: () => <div data-testid="app-metadata" />,
}));

vi.mock("@/components/AppTheme", () => ({
  AppTheme: () => null,
}));

vi.mock("@/components/Layout", () => ({
  Layout: () => <div data-testid="layout" />,
}));

vi.mock("sonner", () => ({
  Toaster: () => null,
}));

describe("App", () => {
  it("renders without crashing", () => {
    const { container } = render(<App />);
    expect(container).toBeTruthy();
  });
});
