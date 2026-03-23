import { render, screen } from "@testing-library/react";

import { ApiKeyRevealDialog } from "./ApiKeyRevealDialog";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockCreated = {
  key: "wk_secret_key_123",
  permissions: ["subscriptions:read" as const, "subscriptions:write" as const],
};

describe("ApiKeyRevealDialog", () => {
  it("renders key and warning when created is provided", () => {
    render(<ApiKeyRevealDialog created={mockCreated as any} onClose={vi.fn()} />);
    expect(screen.getByText("api_key_created_title")).toBeInTheDocument();
    expect(screen.getByText("api_key_created_warning")).toBeInTheDocument();
    expect(screen.getByDisplayValue("wk_secret_key_123")).toBeInTheDocument();
  });

  it("does not render when created is null", () => {
    const { container } = render(<ApiKeyRevealDialog created={null} onClose={vi.fn()} />);
    expect(container.querySelector("[role='dialog']")).not.toBeInTheDocument();
  });
});
