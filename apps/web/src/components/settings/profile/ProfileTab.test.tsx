import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { createQueryClientWrapper } from "@/test/query-client";

const { avatarUrl, updateUser } = vi.hoisted(() => ({
  avatarUrl: vi.fn(),
  updateUser: vi.fn(),
}));

const { listMain } = vi.hoisted(() => ({
  listMain: vi.fn(),
}));

const { refreshUser } = vi.hoisted(() => ({
  refreshUser: vi.fn(),
}));

const { authUser } = vi.hoisted(() => ({
  authUser: {
    id: "user-1",
    name: "Daniel",
    username: "daniel",
    email: "daniel@example.com",
    language: "en",
    budget: 120,
    avatar: "avatar.png",
  },
}));

const { compressImage } = vi.hoisted(() => ({
  compressImage: vi.fn(),
}));

const { toastSuccess, toastError } = vi.hoisted(() => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

const { changeLanguage } = vi.hoisted(() => ({
  changeLanguage: vi.fn(),
}));

// Mutable auth user reference so individual tests can override it
let currentAuthUser: typeof authUser | null = { ...authUser };

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: currentAuthUser,
    refreshUser,
  }),
}));

vi.mock("@/services/users", () => ({
  usersService: {
    avatarUrl,
    update: updateUser,
  },
}));

vi.mock("@/services/currencies", () => ({
  currenciesService: {
    listMain,
  },
}));

vi.mock("@/lib/image", () => ({
  compressImage,
}));

vi.mock("@/lib/toast", () => ({
  toast: {
    success: toastSuccess,
    error: toastError,
  },
}));

vi.mock("@/lib/i18n", () => ({
  __esModule: true,
  default: {
    changeLanguage,
  },
  SUPPORTED_LANGUAGES: [
    { code: "en", name: "English" },
    { code: "pt-BR", name: "Portuguese" },
  ],
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/settings/profile/ProfileAvatarCard", () => ({
  ProfileAvatarCard: ({
    displayName,
    preview,
    onFileChange,
  }: {
    displayName: string;
    preview: string | null;
    onFileChange: (file: File) => void;
  }) => (
    <div data-testid="profile-avatar-card">
      <span data-testid="avatar-display-name">{displayName}</span>
      <span data-testid="avatar-preview">{preview ?? "none"}</span>
      <button
        type="button"
        data-testid="avatar-change"
        onClick={() =>
          onFileChange(new File(["avatar"], "new-avatar.png", { type: "image/png" }))
        }
      >
        change avatar
      </button>
    </div>
  ),
}));

vi.mock("@/components/settings/profile/ProfileBudgetCard", () => ({
  ProfileBudgetCard: ({
    budget,
    symbol,
    code,
    onBudgetChange,
  }: {
    budget: number;
    symbol?: string;
    code?: string;
    onBudgetChange: (value: number) => void;
  }) => (
    <div data-testid="profile-budget-card">
      <span data-testid="budget-value">{String(budget)}</span>
      <span data-testid="budget-symbol">{symbol ?? "none"}</span>
      <span data-testid="budget-code">{code ?? "none"}</span>
      <button
        type="button"
        data-testid="budget-change"
        onClick={() => onBudgetChange(300)}
      >
        change budget
      </button>
    </div>
  ),
}));

import { ProfileTab } from "./ProfileTab";

describe("ProfileTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentAuthUser = { ...authUser };
    avatarUrl.mockReturnValue("https://example.com/avatar.png");
    listMain.mockResolvedValue([
      {
        id: "cur-1",
        name: "Brazilian Real",
        code: "BRL",
        symbol: "R$",
        rate: 1,
        is_main: true,
        user: "user-1",
      },
    ]);
    compressImage.mockImplementation(async (file: File) => file);
    updateUser.mockResolvedValue({ id: "user-1" });
    refreshUser.mockResolvedValue(undefined);
  });

  function renderComponent() {
    const { Wrapper } = createQueryClientWrapper();
    return render(<ProfileTab />, { wrapper: Wrapper });
  }

  it("hydrates avatar preview, budget, and main currency data", async () => {
    renderComponent();

    expect(screen.getByDisplayValue("Daniel")).toBeInTheDocument();
    expect(screen.getByDisplayValue("daniel@example.com")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.getByTestId("avatar-preview")).toHaveTextContent(
        "https://example.com/avatar.png",
      ),
    );
    expect(screen.getByTestId("budget-value")).toHaveTextContent("120");
    await waitFor(() => {
      expect(screen.getByTestId("budget-symbol")).toHaveTextContent("R$");
      expect(screen.getByTestId("budget-code")).toHaveTextContent("BRL");
    });
    expect(listMain).toHaveBeenCalledWith("user-1");
  });

  // Lines 49-53: useEffect with all branches
  // Branch 1: if (user) → true, if (url) → true (url is truthy)
  it("sets preview from avatarUrl when user exists and avatarUrl returns a URL (lines 49-51 true branches)", async () => {
    avatarUrl.mockReturnValue("https://example.com/avatar.png");
    renderComponent();

    await waitFor(() =>
      expect(screen.getByTestId("avatar-preview")).toHaveTextContent(
        "https://example.com/avatar.png",
      ),
    );
    // avatarUrl was called with the user
    expect(avatarUrl).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user-1", avatar: "avatar.png" }),
    );
  });

  // Branch 2: if (user) → true, if (url) → false (avatarUrl returns null)
  it("does not set preview when avatarUrl returns null (line 51 falsy url branch)", async () => {
    avatarUrl.mockReturnValue(null);
    renderComponent();

    await waitFor(() =>
      expect(screen.getByTestId("avatar-preview")).toHaveTextContent("none"),
    );
    // avatarUrl was called (user is truthy) but url was null so setPreview was not called
    expect(avatarUrl).toHaveBeenCalled();
  });

  // Branch 3: if (user) → true, if (url) → false (avatarUrl returns empty string)
  it("does not set preview when avatarUrl returns empty string (line 51 falsy url branch)", async () => {
    avatarUrl.mockReturnValue("");
    renderComponent();

    await waitFor(() =>
      expect(screen.getByTestId("avatar-preview")).toHaveTextContent("none"),
    );
  });

  // Branch 4: if (user) → false (user is null) — the entire useEffect body is skipped
  it("does not call avatarUrl when user is null (line 49 if(user) false branch)", async () => {
    currentAuthUser = null;
    avatarUrl.mockReturnValue(null);

    renderComponent();

    // Wait a tick for any effects to settle
    await waitFor(() => {
      expect(avatarUrl).not.toHaveBeenCalled();
    });
    // preview remains "none" (never set)
    expect(screen.getByTestId("avatar-preview")).toHaveTextContent("none");
  });

  // Branch 5: if (user) → true, user.budget defined (non-null) → setBudget(budget)
  it("sets budget from user.budget when it is defined (line 52 defined budget branch)", async () => {
    currentAuthUser = { ...authUser, budget: 500 };
    renderComponent();

    await waitFor(() =>
      expect(screen.getByTestId("budget-value")).toHaveTextContent("500"),
    );
  });

  // Branch 6: if (user) → true, user.budget is null → setBudget(0) via ?? 0
  it("defaults budget to 0 when user.budget is null (line 52 nullish coalescing branch)", async () => {
    currentAuthUser = {
      ...authUser,
      budget: null as unknown as number,
    };
    renderComponent();

    await waitFor(() =>
      expect(screen.getByTestId("budget-value")).toHaveTextContent("0"),
    );
  });

  // Branch 7: if (user) → true, user.budget is undefined → setBudget(0) via ?? 0
  it("defaults budget to 0 when user.budget is undefined (line 52 nullish coalescing branch)", async () => {
    currentAuthUser = {
      ...authUser,
      budget: undefined as unknown as number,
    };
    renderComponent();

    await waitFor(() =>
      expect(screen.getByTestId("budget-value")).toHaveTextContent("0"),
    );
  });

  it("submits updated profile data, password, avatar, and budget", async () => {
    const compressedFile = new File(["compressed"], "compressed.png", {
      type: "image/png",
    });
    compressImage.mockResolvedValue(compressedFile);
    const { container } = renderComponent();

    const usernameInput = screen.getByPlaceholderText("your_name_placeholder");
    const emailInput = screen.getByPlaceholderText("your.email@example.com");
    const oldPasswordInput = container.querySelector(
      'input[name="oldPwd"]',
    ) as HTMLInputElement;
    const newPasswordInput = container.querySelector(
      'input[name="newPwd"]',
    ) as HTMLInputElement;
    const confirmPasswordInput = container.querySelector(
      'input[name="confPwd"]',
    ) as HTMLInputElement;

    await userEvent.clear(usernameInput);
    await userEvent.type(usernameInput, "Daniel Silva");
    await userEvent.clear(emailInput);
    await userEvent.type(
      emailInput,
      "daniel.silva@example.com",
    );
    await userEvent.type(oldPasswordInput, "old-secret");
    await userEvent.type(newPasswordInput, "new-secret");
    await userEvent.type(confirmPasswordInput, "new-secret");
    await userEvent.click(screen.getByTestId("budget-change"));
    await waitFor(() =>
      expect(screen.getByTestId("budget-value")).toHaveTextContent("300"),
    );
    await userEvent.click(screen.getByTestId("avatar-change"));
    await userEvent.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(1));

    const [, formData] = updateUser.mock.calls[0] as [string, FormData];
    expect(updateUser).toHaveBeenCalledWith("user-1", expect.any(FormData));
    expect(formData.get("name")).toBe("Daniel Silva");
    expect(formData.get("email")).toBe("daniel.silva@example.com");
    expect(formData.get("budget")).toBe("300");
    expect(formData.get("oldPassword")).toBe("old-secret");
    expect(formData.get("password")).toBe("new-secret");
    expect(formData.get("passwordConfirm")).toBe("new-secret");
    expect(formData.get("avatar")).toBe(compressedFile);
    expect(changeLanguage).toHaveBeenCalledWith("en");
    expect(refreshUser).toHaveBeenCalled();
    expect(toastSuccess).toHaveBeenCalledWith("saved");

    await waitFor(() => {
      expect(oldPasswordInput).toHaveValue("");
      expect(newPasswordInput).toHaveValue("");
      expect(confirmPasswordInput).toHaveValue("");
    });
  });

  it("shows an error toast when saving fails", async () => {
    updateUser.mockRejectedValue(new Error("update failed"));
    renderComponent();

    await userEvent.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("update failed"));
  });

  it("does not set preview when avatarUrl returns null", async () => {
    avatarUrl.mockReturnValue(null);
    renderComponent();

    await waitFor(() =>
      expect(screen.getByTestId("avatar-preview")).toHaveTextContent("none"),
    );
  });

  // onSubmit: if (data.oldPwd && data.newPwd) false branch — no password fields appended
  it("does not include password fields in FormData when oldPwd is empty", async () => {
    renderComponent();

    await userEvent.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(1));
    const [, formData] = updateUser.mock.calls[0] as [string, FormData];
    expect(formData.get("oldPassword")).toBeNull();
    expect(formData.get("password")).toBeNull();
  });

  // onSubmit: if (avatarFile) false branch — no avatar appended
  it("does not include avatar in FormData when no file selected", async () => {
    renderComponent();

    await userEvent.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() => expect(updateUser).toHaveBeenCalledTimes(1));
    const [, formData] = updateUser.mock.calls[0] as [string, FormData];
    expect(formData.get("avatar")).toBeNull();
  });

  // onSubmit: error when e is not an Error instance → String(e)
  it("shows string error toast when saving fails with non-Error rejection", async () => {
    updateUser.mockRejectedValue("plain string error");
    renderComponent();

    await userEvent.click(screen.getByRole("button", { name: "save" }));

    await waitFor(() => expect(toastError).toHaveBeenCalledWith("plain string error"));
  });
});
