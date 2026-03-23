import { fireEvent, render, screen } from "@testing-library/react";

import { OIDCSecretField } from "./OIDCSecretField";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("OIDCSecretField", () => {
  const baseProps = {
    secretConfigured: false,
    secretValue: "",
    onRemove: vi.fn(),
    onSave: vi.fn(),
    onSecretChange: vi.fn(),
  };

  it("renders label", () => {
    render(<OIDCSecretField {...baseProps} />);
    expect(screen.getByText("oidc_client_secret")).toBeInTheDocument();
  });

  it("shows remove button when secret is configured", () => {
    render(<OIDCSecretField {...baseProps} secretConfigured />);
    expect(screen.getByText("remove")).toBeInTheDocument();
  });

  it("hides remove button when secret is not configured", () => {
    render(<OIDCSecretField {...baseProps} secretConfigured={false} />);
    expect(screen.queryByText("remove")).not.toBeInTheDocument();
  });

  it("calls onSecretChange when input changes", () => {
    render(<OIDCSecretField {...baseProps} />);
    const input = screen.getByDisplayValue("");
    fireEvent.change(input, { target: { value: "new-secret" } });
    expect(baseProps.onSecretChange).toHaveBeenCalledWith("new-secret");
  });

  it("calls onSave on blur when value is not empty", () => {
    render(<OIDCSecretField {...baseProps} secretValue="my-secret" />);
    const input = screen.getByDisplayValue("my-secret");
    fireEvent.blur(input);
    expect(baseProps.onSave).toHaveBeenCalledWith("my-secret");
  });

  it("does not call onSave on blur when value is empty", () => {
    const onSave = vi.fn();
    render(<OIDCSecretField {...baseProps} secretValue="  " onSave={onSave} />);
    const inputs = document.querySelectorAll('input[type="password"]');
    fireEvent.blur(inputs[0]);
    expect(onSave).not.toHaveBeenCalled();
  });
});
