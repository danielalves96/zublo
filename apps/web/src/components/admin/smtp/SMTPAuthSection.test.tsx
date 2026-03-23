import { fireEvent, render, screen } from "@testing-library/react";

import type { SMTPFormValues } from "./smtp.types";
import { SMTPAuthSection } from "./SMTPAuthSection";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("SMTPAuthSection", () => {
  const form: SMTPFormValues = {
    enabled: true, host: "smtp.test.com", port: 587,
    username: "user@test.com", password: "",
    tls: true, authMethod: "PLAIN", senderAddress: "", senderName: "",
  };

  it("renders username and password fields", () => {
    render(<SMTPAuthSection form={form} hasExistingPassword={false} setField={vi.fn()} />);
    expect(screen.getByText("smtp_username")).toBeInTheDocument();
    expect(screen.getByText("smtp_password")).toBeInTheDocument();
  });

  it("shows unchanged placeholder when hasExistingPassword", () => {
    render(<SMTPAuthSection form={form} hasExistingPassword setField={vi.fn()} />);
    expect(screen.getByPlaceholderText("smtp_password_unchanged")).toBeInTheDocument();
  });

  it("calls setField on username change", () => {
    const setField = vi.fn();
    render(<SMTPAuthSection form={form} hasExistingPassword={false} setField={setField} />);
    fireEvent.change(screen.getByPlaceholderText("user@example.com"), { target: { value: "new@test.com" } });
    expect(setField).toHaveBeenCalledWith("username", "new@test.com");
  });
});
