import { createAppRouter } from "./routes";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock("sonner", () => ({
  Toaster: () => null,
}));

vi.mock("@/components/AppTheme", () => ({
  AppTheme: () => null,
}));

vi.mock("@/components/Layout", () => ({
  Layout: () => null,
}));

describe("routes", () => {
  it("creates a router instance", () => {
    const mockQueryClient = { invalidateQueries: vi.fn() } as any;
    const mockAuth = { user: null, isLoading: false, isAdmin: false };

    const router = createAppRouter({ queryClient: mockQueryClient, auth: mockAuth });
    expect(router).toBeDefined();
    expect(typeof router.navigate).toBe("function");
    expect(typeof router.invalidate).toBe("function");
  });
});
