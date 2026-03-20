import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DISPLAY_TOGGLES } from "@/components/settings/display/display.config";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }));

const mockAuthUser = vi.hoisted(() => ({
  user: { id: "user-1" } as Record<string, any>,
}));

vi.mock("@/components/settings/shared/useUserSettingsMutation", () => ({
  useUserSettingsMutation: () => ({ mutate }),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: mockAuthUser.user }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("@/components/settings/display/DisplayToggleCard", () => ({
  DisplayToggleCard: ({
    onToggle,
    label,
    checked,
  }: {
    onToggle: () => void;
    label: string;
    description: string;
    checked: boolean;
  }) => (
    <button
      data-testid={`toggle-${label}`}
      data-checked={String(checked)}
      onClick={onToggle}
    >
      {label}
    </button>
  ),
}));

import { DisplayTab } from "./DisplayTab";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DisplayTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthUser.user = { id: "user-1" };
  });

  it("renders all DISPLAY_TOGGLES and the payment tracking card", () => {
    render(<DisplayTab />);

    for (const { labelKey } of DISPLAY_TOGGLES) {
      expect(screen.getByTestId(`toggle-${labelKey}`)).toBeInTheDocument();
    }
    expect(screen.getByTestId("toggle-payment_tracking")).toBeInTheDocument();
  });

  it("calls mutate with the negated value when a toggle is clicked while the field is true", async () => {
    mockAuthUser.user = { id: "user-1", monthly_price: true };
    render(<DisplayTab />);
    await userEvent.click(screen.getByTestId("toggle-monthly_price"));
    expect(mutate).toHaveBeenCalledWith({ monthly_price: false });
  });

  it("calls mutate with true when toggling an unset (undefined) field", async () => {
    mockAuthUser.user = { id: "user-1" };
    render(<DisplayTab />);
    await userEvent.click(screen.getByTestId("toggle-monthly_price"));
    expect(mutate).toHaveBeenCalledWith({ monthly_price: true });
  });

  it("calls mutate for the payment_tracking field", async () => {
    mockAuthUser.user = { id: "user-1", payment_tracking: false };
    render(<DisplayTab />);
    await userEvent.click(screen.getByTestId("toggle-payment_tracking"));
    expect(mutate).toHaveBeenCalledWith({ payment_tracking: true });
  });

  it("passes checked=true when the user field is truthy", () => {
    mockAuthUser.user = { id: "user-1", monthly_price: true, payment_tracking: true };
    render(<DisplayTab />);
    expect(
      screen.getByTestId("toggle-monthly_price").getAttribute("data-checked"),
    ).toBe("true");
    expect(
      screen.getByTestId("toggle-payment_tracking").getAttribute("data-checked"),
    ).toBe("true");
  });

  it("passes checked=false when the user field is falsy", () => {
    mockAuthUser.user = { id: "user-1", monthly_price: false, payment_tracking: false };
    render(<DisplayTab />);
    expect(
      screen.getByTestId("toggle-monthly_price").getAttribute("data-checked"),
    ).toBe("false");
    expect(
      screen.getByTestId("toggle-payment_tracking").getAttribute("data-checked"),
    ).toBe("false");
  });
});
