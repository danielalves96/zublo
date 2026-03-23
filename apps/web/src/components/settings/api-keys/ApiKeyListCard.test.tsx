import { fireEvent, render, screen } from "@testing-library/react";

import { ApiKeyListCard } from "./ApiKeyListCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockKey = {
  id: "k1",
  name: "Test Key",
  key_prefix: "wk_abc",
  permissions: ["subscriptions:read" as const],
  created: "2025-01-01T00:00:00Z",
  last_used_at: null,
};

describe("ApiKeyListCard", () => {
  it("renders empty state when no keys", () => {
    render(<ApiKeyListCard keys={[]} isLoading={false} onCreate={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("api_key_no_keys")).toBeInTheDocument();
  });

  it("renders key row with name and prefix", () => {
    render(<ApiKeyListCard keys={[mockKey as any]} isLoading={false} onCreate={vi.fn()} onEdit={vi.fn()} onDelete={vi.fn()} />);
    expect(screen.getByText("Test Key")).toBeInTheDocument();
    expect(screen.getByText("wk_abc")).toBeInTheDocument();
  });

  it("calls onCreate when new api key button clicked", () => {
    const onCreate = vi.fn();
    render(<ApiKeyListCard keys={[]} isLoading={false} onCreate={onCreate} onEdit={vi.fn()} onDelete={vi.fn()} />);
    const buttons = screen.getAllByRole("button");
    const newKeyBtn = buttons.find((b) => b.textContent?.includes("new_api_key"));
    fireEvent.click(newKeyBtn!);
    expect(onCreate).toHaveBeenCalled();
  });
});
