import { fireEvent, render, screen } from "@testing-library/react";

import type { SMTPFormValues } from "./smtp.types";
import { SMTPServerSection } from "./SMTPServerSection";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("SMTPServerSection", () => {
  const form: SMTPFormValues = {
    enabled: true, host: "smtp.test.com", port: 587,
    username: "", password: "",
    tls: true, authMethod: "PLAIN",
    senderAddress: "", senderName: "",
  };

  it("renders server heading", () => {
    render(<SMTPServerSection form={form} setField={vi.fn()} />);
    expect(screen.getByText("smtp_server")).toBeInTheDocument();
  });

  it("displays host and port values", () => {
    render(<SMTPServerSection form={form} setField={vi.fn()} />);
    expect(screen.getByDisplayValue("smtp.test.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("587")).toBeInTheDocument();
  });

  it("renders TLS toggle", () => {
    render(<SMTPServerSection form={form} setField={vi.fn()} />);
    expect(screen.getByText("TLS")).toBeInTheDocument();
  });

  it("calls setField on host change", () => {
    const setField = vi.fn();
    render(<SMTPServerSection form={form} setField={setField} />);
    fireEvent.change(screen.getByDisplayValue("smtp.test.com"), { target: { value: "new.smtp.com" } });
    expect(setField).toHaveBeenCalledWith("host", "new.smtp.com");
  });
});
