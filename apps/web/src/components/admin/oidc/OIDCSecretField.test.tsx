import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { OIDCSecretField } from "./OIDCSecretField";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe("OIDCSecretField", () => {
  const defaultProps = {
    secretConfigured: false,
    secretValue: "",
    onRemove: vi.fn(),
    onSave: vi.fn(),
    onSecretChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly when secret is not configured", () => {
    render(<OIDCSecretField {...defaultProps} />);
    
    expect(screen.getByText("oidc_client_secret")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "remove" })).not.toBeInTheDocument();
  });

  it("finds by placeholder/password type", () => {
    const { container } = render(<OIDCSecretField {...defaultProps} />);
    const input = container.querySelector('input[type="password"]') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toBe("");
  });

  it("renders remove button and different placeholder when secret is configured", () => {
    const { container } = render(<OIDCSecretField {...defaultProps} secretConfigured={true} />);
    
    expect(screen.getByRole("button", { name: "remove" })).toBeInTheDocument();
    const input = container.querySelector('input[type="password"]') as HTMLInputElement;
    expect(input.placeholder).toBe("••••••••••••••••");
  });

  it("calls onSecretChange when typing", () => {
    const { container } = render(<OIDCSecretField {...defaultProps} />);
    const input = container.querySelector('input[type="password"]') as HTMLInputElement;
    
    fireEvent.change(input, { target: { value: "newsecret" } });
    expect(defaultProps.onSecretChange).toHaveBeenCalledWith("newsecret");
  });

  it("calls onSave when blurring with non-empty string", async () => {
    const { container } = render(<OIDCSecretField {...defaultProps} secretValue=" newsecret " />);
    const input = container.querySelector('input[type="password"]') as HTMLInputElement;
    
    await userEvent.click(input);
    await userEvent.tab(); // Blur the input
    expect(defaultProps.onSave).toHaveBeenCalledWith("newsecret");
  });

  it("does not call onSave when blurring with empty string", async () => {
    const { container } = render(<OIDCSecretField {...defaultProps} secretValue="   " />);
    const input = container.querySelector('input[type="password"]') as HTMLInputElement;
    
    await userEvent.click(input);
    await userEvent.tab(); // Blur the input
    expect(defaultProps.onSave).not.toHaveBeenCalled();
  });

  it("calls onRemove when clicking remove button", () => {
    render(<OIDCSecretField {...defaultProps} secretConfigured={true} />);
    const removeButton = screen.getByRole("button", { name: "remove" });
    
    fireEvent.click(removeButton);
    expect(defaultProps.onRemove).toHaveBeenCalled();
  });
});
