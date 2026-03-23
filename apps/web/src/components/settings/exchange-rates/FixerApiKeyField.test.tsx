import { render, screen } from "@testing-library/react";

import { FixerApiKeyField } from "./FixerApiKeyField";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("FixerApiKeyField", () => {
  it("renders api key label", () => {
    render(
      <FixerApiKeyField
        apiKey=""
        apiKeyConfigured={false}
        provider="fixer"
        providerLink="https://fixer.io"
        removeStoredApiKey={false}
        onApiKeyChange={vi.fn()}
        onRemoveStoredApiKey={vi.fn()}
      />,
    );
    expect(screen.getByText("fixer_api_key")).toBeInTheDocument();
  });

  it("renders get free api key link", () => {
    render(
      <FixerApiKeyField
        apiKey=""
        apiKeyConfigured={false}
        provider="fixer"
        providerLink="https://fixer.io"
        removeStoredApiKey={false}
        onApiKeyChange={vi.fn()}
        onRemoveStoredApiKey={vi.fn()}
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "https://fixer.io");
  });
});
