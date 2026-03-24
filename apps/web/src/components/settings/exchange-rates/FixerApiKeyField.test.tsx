import { fireEvent, render, screen } from "@testing-library/react";

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

  it("shows remove button when apiKeyConfigured and not removeStoredApiKey", () => {
    render(
      <FixerApiKeyField
        apiKey=""
        apiKeyConfigured={true}
        provider="fixer"
        providerLink="https://fixer.io"
        removeStoredApiKey={false}
        onApiKeyChange={vi.fn()}
        onRemoveStoredApiKey={vi.fn()}
      />,
    );
    expect(screen.getByText("remove")).toBeInTheDocument();
  });

  it("calls onRemoveStoredApiKey when remove button clicked", () => {
    const onRemoveStoredApiKey = vi.fn();
    render(
      <FixerApiKeyField
        apiKey=""
        apiKeyConfigured={true}
        provider="fixer"
        providerLink="https://fixer.io"
        removeStoredApiKey={false}
        onApiKeyChange={vi.fn()}
        onRemoveStoredApiKey={onRemoveStoredApiKey}
      />,
    );
    fireEvent.click(screen.getByText("remove"));
    expect(onRemoveStoredApiKey).toHaveBeenCalled();
  });

  it("does not show remove button when removeStoredApiKey is true", () => {
    render(
      <FixerApiKeyField
        apiKey=""
        apiKeyConfigured={true}
        provider="fixer"
        providerLink="https://fixer.io"
        removeStoredApiKey={true}
        onApiKeyChange={vi.fn()}
        onRemoveStoredApiKey={vi.fn()}
      />,
    );
    expect(screen.queryByText("remove")).not.toBeInTheDocument();
  });

  it("shows 'saved' hint text when apiKeyConfigured and not removing", () => {
    render(
      <FixerApiKeyField
        apiKey=""
        apiKeyConfigured={true}
        provider="fixer"
        providerLink="https://fixer.io"
        removeStoredApiKey={false}
        onApiKeyChange={vi.fn()}
        onRemoveStoredApiKey={vi.fn()}
      />,
    );
    expect(screen.getByText(/saved/)).toBeInTheDocument();
  });

  it("shows remove hint text when removeStoredApiKey is true", () => {
    render(
      <FixerApiKeyField
        apiKey=""
        apiKeyConfigured={true}
        provider="fixer"
        providerLink="https://fixer.io"
        removeStoredApiKey={true}
        onApiKeyChange={vi.fn()}
        onRemoveStoredApiKey={vi.fn()}
      />,
    );
    // The hint paragraph contains "fixer_api_key remove. save."
    const hints = document.querySelectorAll("p");
    const hintTexts = Array.from(hints).map((p) => p.textContent ?? "");
    expect(hintTexts.some((t) => t.includes("fixer_api_key") && t.includes("save"))).toBe(true);
  });

  it("shows APILayer text in link for apilayer provider", () => {
    render(
      <FixerApiKeyField
        apiKey=""
        apiKeyConfigured={false}
        provider="apilayer"
        providerLink="https://apilayer.com"
        removeStoredApiKey={false}
        onApiKeyChange={vi.fn()}
        onRemoveStoredApiKey={vi.fn()}
      />,
    );
    expect(screen.getByText(/APILayer/)).toBeInTheDocument();
  });

  it("calls onApiKeyChange when input value changes", () => {
    const onApiKeyChange = vi.fn();
    render(
      <FixerApiKeyField
        apiKey=""
        apiKeyConfigured={false}
        provider="fixer"
        providerLink="https://fixer.io"
        removeStoredApiKey={false}
        onApiKeyChange={onApiKeyChange}
        onRemoveStoredApiKey={vi.fn()}
      />,
    );
    // The input is type="password", not a textbox role - query by type
    const input = document.querySelector("input[type='password']") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "my-key" } });
    expect(onApiKeyChange).toHaveBeenCalledWith("my-key");
  });
});
