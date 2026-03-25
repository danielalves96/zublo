import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createQueryClientWrapper } from "@/test/query-client";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { apiKeysList, apiKeysCreate, apiKeysUpdate, apiKeysDelete } = vi.hoisted(
  () => ({
    apiKeysList: vi.fn(),
    apiKeysCreate: vi.fn(),
    apiKeysUpdate: vi.fn(),
    apiKeysDelete: vi.fn(),
  }),
);

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock("@/services/apiKeys", () => ({
  apiKeysService: {
    list: apiKeysList,
    create: apiKeysCreate,
    update: apiKeysUpdate,
    delete: apiKeysDelete,
  },
}));

let mockAuthUser: { id?: string } | null = { id: "user-1" };
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockAuthUser }),
}));

vi.mock("@/lib/toast", () => ({
  toast: { success: toastSuccess, error: toastError },
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string, opts?: any) => (opts?.name ? `${key}:${opts.name}` : key) }),
}));

// ── Sub-component mocks ───────────────────────────────────────────────────────

vi.mock("@/components/settings/api-keys/ApiKeyListCard", () => ({
  ApiKeyListCard: ({ keys, isLoading, onCreate, onEdit, onDelete }: any) => (
    <div>
      {isLoading && <span data-testid="list-loading">loading</span>}
      {keys.map((k: any) => (
        <div key={k.id} data-testid={`key-item-${k.id}`}>
          <span data-testid={`key-name-${k.id}`}>{k.name}</span>
          <button data-testid={`edit-${k.id}`} onClick={() => onEdit(k)}>
            edit
          </button>
          <button data-testid={`delete-${k.id}`} onClick={() => onDelete(k.id)}>
            delete
          </button>
        </div>
      ))}
      <button data-testid="create-btn" onClick={onCreate}>
        create
      </button>
      <button data-testid="delete-unknown" onClick={() => onDelete("unknown-id")}>
        delete unknown
      </button>
    </div>
  ),
}));

vi.mock("@/components/settings/api-keys/ApiKeyFormDialog", () => ({
  CreateApiKeyDialog: ({ open, onClose, onSubmit, isPending }: any) =>
    open ? (
      <div data-testid="create-dialog">
        <span data-testid="create-is-pending">{String(isPending)}</span>
        <button
          data-testid="create-submit"
          onClick={() => onSubmit("new-key", ["subscriptions:read"])}
        >
          submit
        </button>
        <button data-testid="create-close" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,

  EditApiKeyDialog: ({ open, onClose, onSubmit, isPending }: any) => (
    <div data-testid="edit-dialog-wrapper">
      {open ? (
        <div data-testid="edit-dialog">
          <span data-testid="edit-is-pending">{String(isPending)}</span>
          <button
            data-testid="edit-submit"
            onClick={() => onSubmit("updated-name", ["subscriptions:read"])}
          >
            submit
          </button>
          <button data-testid="edit-close" onClick={onClose}>
            close
          </button>
        </div>
      ) : null}
      <button
        data-testid="edit-submit-no-pending-key"
        onClick={() => onSubmit("updated-name", ["subscriptions:read"])}
      >
        submit without pending key
      </button>
    </div>
  ),
}));

vi.mock("@/components/settings/api-keys/ApiKeyRevealDialog", () => ({
  ApiKeyRevealDialog: ({ created, onClose }: any) =>
    created ? (
      <div data-testid="reveal-dialog">
        <button data-testid="reveal-close" onClick={onClose}>
          close
        </button>
      </div>
    ) : null,
}));

vi.mock("@/components/settings/api-keys/ApiKeyEndpointsReference", () => ({
  ApiKeyEndpointsReference: () => <div data-testid="endpoints-ref" />,
}));

vi.mock("@/components/ui/confirm-dialog", () => ({
  ConfirmDialog: ({ open, onOpenChange, onConfirm, title, description }: any) =>
    open ? (
      <div data-testid="confirm-dialog">
        <span data-testid="confirm-title">{title}</span>
        <span data-testid="confirm-description">{description}</span>
        <button data-testid="confirm-ok" onClick={onConfirm}>
          confirm
        </button>
        <button
          data-testid="confirm-cancel"
          onClick={() => onOpenChange(false)}
        >
          cancel
        </button>
        <button
          data-testid="confirm-reopen"
          onClick={() => onOpenChange(true)}
        >
          reopen
        </button>
      </div>
    ) : null,
}));

import { ApiKeyTab } from "./ApiKeyTab";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeKey(id: string, name = `Key ${id}`) {
  return { id, name, permissions: ["subscriptions:read"] };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ApiKeyTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser = { id: "user-1" };
    apiKeysList.mockResolvedValue([]);
    apiKeysCreate.mockResolvedValue({ id: "new-id", key: "secret", name: "new-key" });
    apiKeysUpdate.mockResolvedValue(makeKey("key-1", "updated-name"));
    apiKeysDelete.mockResolvedValue(undefined);
  });

  it("passes isLoading=true to ApiKeyListCard while the query is pending", () => {
    apiKeysList.mockImplementation(() => new Promise(() => {}));
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    expect(screen.getByTestId("list-loading")).toBeInTheDocument();
  });

  it("renders loaded keys in ApiKeyListCard", async () => {
    apiKeysList.mockResolvedValue([makeKey("key-1"), makeKey("key-2")]);
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByTestId("key-item-key-1")).toBeInTheDocument(),
    );
    expect(screen.getByTestId("key-item-key-2")).toBeInTheDocument();
  });

  it("renders the endpoints reference section", async () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() =>
      expect(screen.getByTestId("endpoints-ref")).toBeInTheDocument(),
    );
  });

  // ── Create flow ────────────────────────────────────────────────────────────

  it("opens the create dialog when onCreate is triggered", async () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByTestId("create-btn"));
    expect(screen.getByTestId("create-dialog")).toBeInTheDocument();
  });

  it("closes the create dialog on close without submitting", async () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByTestId("create-close"));
    expect(screen.queryByTestId("create-dialog")).not.toBeInTheDocument();
  });

  it("calls apiKeysCreate and opens the reveal dialog on successful creation", async () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByTestId("create-submit"));
    await waitFor(() =>
      expect(apiKeysCreate).toHaveBeenCalledWith("new-key", [
        "subscriptions:read",
      ]),
    );
    await waitFor(() =>
      expect(screen.queryByTestId("create-dialog")).not.toBeInTheDocument(),
    );
    expect(screen.getByTestId("reveal-dialog")).toBeInTheDocument();
  });

  it("shows error toast when create mutation fails", async () => {
    apiKeysCreate.mockRejectedValue(new Error("already exists"));
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByTestId("create-submit"));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });

  it("reflects isPending=true on the create dialog while mutation is in flight", async () => {
    apiKeysCreate.mockImplementation(() => new Promise(() => {}));
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByTestId("create-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("create-is-pending")).toHaveTextContent("true"),
    );
  });

  it("closes the reveal dialog when onClose is called", async () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByTestId("create-btn"));
    await userEvent.click(screen.getByTestId("create-submit"));
    await waitFor(() => screen.getByTestId("reveal-dialog"));
    await userEvent.click(screen.getByTestId("reveal-close"));
    expect(screen.queryByTestId("reveal-dialog")).not.toBeInTheDocument();
  });

  // ── Edit flow ──────────────────────────────────────────────────────────────

  it("opens the edit dialog when onEdit is triggered with a key", async () => {
    apiKeysList.mockResolvedValue([makeKey("key-1")]);
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("edit-key-1"));
    await userEvent.click(screen.getByTestId("edit-key-1"));
    expect(screen.getByTestId("edit-dialog")).toBeInTheDocument();
  });

  it("closes the edit dialog on close without submitting", async () => {
    apiKeysList.mockResolvedValue([makeKey("key-1")]);
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("edit-key-1"));
    await userEvent.click(screen.getByTestId("edit-key-1"));
    await userEvent.click(screen.getByTestId("edit-close"));
    expect(screen.queryByTestId("edit-dialog")).not.toBeInTheDocument();
  });

  it("calls apiKeysUpdate and shows success toast on successful edit", async () => {
    apiKeysList.mockResolvedValue([makeKey("key-1")]);
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("edit-key-1"));
    await userEvent.click(screen.getByTestId("edit-key-1"));
    await userEvent.click(screen.getByTestId("edit-submit"));
    await waitFor(() =>
      expect(apiKeysUpdate).toHaveBeenCalledWith(
        "key-1",
        "updated-name",
        ["subscriptions:read"],
      ),
    );
    await waitFor(() =>
      expect(screen.queryByTestId("edit-dialog")).not.toBeInTheDocument(),
    );
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("shows error toast when update mutation fails", async () => {
    apiKeysList.mockResolvedValue([makeKey("key-1")]);
    apiKeysUpdate.mockRejectedValue(new Error("forbidden"));
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("edit-key-1"));
    await userEvent.click(screen.getByTestId("edit-key-1"));
    await userEvent.click(screen.getByTestId("edit-submit"));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });

  it("reflects isPending=true on the edit dialog while mutation is in flight", async () => {
    apiKeysList.mockResolvedValue([makeKey("key-1")]);
    apiKeysUpdate.mockImplementation(() => new Promise(() => {}));
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("edit-key-1"));
    await userEvent.click(screen.getByTestId("edit-key-1"));
    await userEvent.click(screen.getByTestId("edit-submit"));
    await waitFor(() =>
      expect(screen.getByTestId("edit-is-pending")).toHaveTextContent("true"),
    );
  });

  // ── Delete flow ────────────────────────────────────────────────────────────

  it("opens the confirm dialog when onDelete is triggered with a known key id", async () => {
    apiKeysList.mockResolvedValue([makeKey("key-1")]);
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("delete-key-1"));
    await userEvent.click(screen.getByTestId("delete-key-1"));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("shows the key name in the confirm dialog description", async () => {
    apiKeysList.mockResolvedValue([makeKey("key-1", "My API Key")]);
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("delete-key-1"));
    await userEvent.click(screen.getByTestId("delete-key-1"));
    expect(screen.getByTestId("confirm-description")).toHaveTextContent(
      "My API Key",
    );
  });

  it("does not open the confirm dialog when onDelete is called with an unknown key id", async () => {
    apiKeysList.mockResolvedValue([makeKey("key-1")]);
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("delete-unknown"));
    await userEvent.click(screen.getByTestId("delete-unknown"));
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
  });

  it("closes the confirm dialog on cancel without deleting", async () => {
    apiKeysList.mockResolvedValue([makeKey("key-1")]);
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("delete-key-1"));
    await userEvent.click(screen.getByTestId("delete-key-1"));
    await userEvent.click(screen.getByTestId("confirm-cancel"));
    expect(screen.queryByTestId("confirm-dialog")).not.toBeInTheDocument();
    expect(apiKeysDelete).not.toHaveBeenCalled();
  });

  it("does not clear pendingDeleteId when onOpenChange is called with true", async () => {
    apiKeysList.mockResolvedValue([makeKey("key-1")]);
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("delete-key-1"));
    await userEvent.click(screen.getByTestId("delete-key-1"));
    await userEvent.click(screen.getByTestId("confirm-reopen"));
    expect(screen.getByTestId("confirm-dialog")).toBeInTheDocument();
  });

  it("calls apiKeysDelete and shows success toast when deletion is confirmed", async () => {
    apiKeysList.mockResolvedValue([makeKey("key-1")]);
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("delete-key-1"));
    await userEvent.click(screen.getByTestId("delete-key-1"));
    await userEvent.click(screen.getByTestId("confirm-ok"));
    await waitFor(() => expect(apiKeysDelete).toHaveBeenCalledWith("key-1"));
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("shows error toast when delete mutation fails", async () => {
    apiKeysList.mockResolvedValue([makeKey("key-1")]);
    apiKeysDelete.mockRejectedValue(new Error("forbidden"));
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("delete-key-1"));
    await userEvent.click(screen.getByTestId("delete-key-1"));
    await userEvent.click(screen.getByTestId("confirm-ok"));
    await waitFor(() => expect(toastError).toHaveBeenCalled());
  });

  it("renders with empty userId when user is null (covers ?? '' branch on line 26)", async () => {
    mockAuthUser = null;
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => expect(screen.getByTestId("endpoints-ref")).toBeInTheDocument());
  });

  it("does not call update mutation when onSubmit is called with no pendingEditKey", async () => {
    const { Wrapper } = createQueryClientWrapper();
    render(<ApiKeyTab />, { wrapper: Wrapper });
    await waitFor(() => screen.getByTestId("edit-submit-no-pending-key"));
    await userEvent.click(screen.getByTestId("edit-submit-no-pending-key"));
    expect(apiKeysUpdate).not.toHaveBeenCalled();
  });
});
