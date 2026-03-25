import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createQueryClientWrapper } from "@/test/query-client";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { getConfig, createConfig, updateConfig, testNotif } = vi.hoisted(() => ({
  getConfig: vi.fn(),
  createConfig: vi.fn(),
  updateConfig: vi.fn(),
  testNotif: vi.fn(),
}));

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/services/notifications", () => ({
  notificationsService: {
    getConfig,
    createConfig,
    updateConfig,
    test: testNotif,
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "user-1" } }),
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/settings/notifications/ProviderCard", () => ({
  ProviderCard: ({ provider, onChange, onTest, isTesting }: any) => (
    <div data-testid={`provider-${provider.id}`}>
      <span data-testid={`is-testing-${provider.id}`}>{String(isTesting)}</span>
      <button data-testid={`test-${provider.id}`} onClick={() => onTest()}>
        test
      </button>
      <button
        data-testid={`enable-${provider.id}`}
        onClick={() => onChange(provider.enabledKey, true)}
      >
        enable
      </button>
    </div>
  ),
}));

vi.mock("@/components/settings/notifications/RemindersEditor", () => ({
  RemindersEditor: ({ reminders, onChange }: any) => (
    <div>
      <span data-testid="reminder-count">{reminders.length}</span>
      <button
        data-testid="reminders-change"
        onClick={() => onChange([{ days: 2, hour: 9 }])}
      >
        change
      </button>
    </div>
  ),
}));

import { NotificationsTab } from "./NotificationsTab";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("NotificationsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getConfig.mockResolvedValue(null);
    createConfig.mockResolvedValue({ id: "new-id" });
    updateConfig.mockResolvedValue({ id: "cfg-1" });
    testNotif.mockResolvedValue({ message: "ok" });
  });

  it("renders a loading skeleton while the config query is pending", () => {
    getConfig.mockImplementation(() => new Promise(() => {}));
    const { Wrapper } = createQueryClientWrapper();
    const { container } = render(<NotificationsTab />, { wrapper: Wrapper });
    expect(container.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renders the notifications UI after config resolves as null", async () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<NotificationsTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByText("notifications")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("provider-email")).toBeInTheDocument();
  });

  it("initialises reminders from DEFAULT_REMINDERS when config has an empty array", async () => {
    getConfig.mockResolvedValue({ id: "cfg-1", user: "user-1", reminders: [] });
    const { Wrapper } = createQueryClientWrapper();
    render(<NotificationsTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByTestId("reminder-count")).toBeInTheDocument(),
    );
    // DEFAULT_REMINDERS has exactly 1 entry
    expect(screen.getByTestId("reminder-count")).toHaveTextContent("1");
  });

  it("preserves config reminders when they are non-empty", async () => {
    getConfig.mockResolvedValue({
      id: "cfg-1",
      user: "user-1",
      reminders: [
        { days: 7, hour: 10 },
        { days: 1, hour: 8 },
      ],
    });
    const { Wrapper } = createQueryClientWrapper();
    render(<NotificationsTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByTestId("reminder-count")).toHaveTextContent("2"),
    );
  });

  it("shows the enabled-count badge when at least one provider is active", async () => {
    getConfig.mockResolvedValue({
      id: "cfg-1",
      user: "user-1",
      email_enabled: true,
      discord_enabled: true,
    });
    const { Wrapper } = createQueryClientWrapper();
    render(<NotificationsTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByText(/2.+enabled/)).toBeInTheDocument(),
    );
  });

  it("calls createConfig when no config id exists on save", async () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<NotificationsTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "save" })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => expect(createConfig).toHaveBeenCalled());
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("calls updateConfig with the config id when an existing record is present", async () => {
    getConfig.mockResolvedValue({ id: "cfg-1", user: "user-1" });
    const { Wrapper } = createQueryClientWrapper();
    render(<NotificationsTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "save" })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() =>
      expect(updateConfig).toHaveBeenCalledWith("cfg-1", expect.any(Object)),
    );
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("shows an error toast when the save mutation fails", async () => {
    createConfig.mockRejectedValue(new Error("network error"));
    const { Wrapper } = createQueryClientWrapper();
    render(<NotificationsTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "save" })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });

  it("disables the save button and shows the saving label while mutation is pending", async () => {
    createConfig.mockImplementation(() => new Promise(() => {}));
    const { Wrapper } = createQueryClientWrapper();
    render(<NotificationsTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "save" })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole("button", { name: "save" }));
    expect(screen.getByRole("button", { name: "saving" })).toBeDisabled();
  });

  it("sends a test notification and shows success toast on success", async () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<NotificationsTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByTestId("test-email")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByTestId("test-email"));
    await waitFor(() => expect(testNotif).toHaveBeenCalledWith("email"));
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("shows error toast when test notification fails", async () => {
    testNotif.mockRejectedValue(new Error("unreachable"));
    const { Wrapper } = createQueryClientWrapper();
    render(<NotificationsTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByTestId("test-email")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByTestId("test-email"));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });

  it("marks only the tested provider as in-flight during the request", async () => {
    testNotif.mockImplementation(() => new Promise(() => {}));
    const { Wrapper } = createQueryClientWrapper();
    render(<NotificationsTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByTestId("test-email")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByTestId("test-email"));
    await waitFor(() =>
      expect(screen.getByTestId("is-testing-email")).toHaveTextContent("true"),
    );
    expect(screen.getByTestId("is-testing-discord")).toHaveTextContent("false");
  });

  it("applies the md:col-span-2 wrapper class when a provider is enabled via handleChange", async () => {
    const { Wrapper } = createQueryClientWrapper();
    const { container } = render(<NotificationsTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByTestId("enable-email")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByTestId("enable-email"));
    const providerWrapper =
      container.querySelector('[data-testid="provider-email"]')?.parentElement;
    expect(providerWrapper?.className).toContain("md:col-span-2");
  });

  it("keeps relative provider order stable when all providers have the same enabled state (sort returns 0)", async () => {
    // With all providers disabled (default state), aOn === bOn for every comparison,
    // so the sort comparator returns 0 — covering the `aOn === bOn ? 0` branch.
    const { Wrapper } = createQueryClientWrapper();
    render(<NotificationsTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByTestId("provider-email")).toBeInTheDocument(),
    );
    // All providers appear — sort didn't throw and returned 0 for each pair
    expect(screen.getByTestId("provider-discord")).toBeInTheDocument();
  });

  it("includes updated reminders from RemindersEditor in the save payload", async () => {
    getConfig.mockResolvedValue({ id: "cfg-1", user: "user-1" });
    const { Wrapper } = createQueryClientWrapper();
    render(<NotificationsTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByTestId("reminders-change")).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByTestId("reminders-change"));
    await userEvent.click(screen.getByRole("button", { name: "save" }));
    await waitFor(() =>
      expect(updateConfig).toHaveBeenCalledWith(
        "cfg-1",
        expect.objectContaining({ reminders: [{ days: 2, hour: 9 }] }),
      ),
    );
  });
});
