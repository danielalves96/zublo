import { fireEvent, render, screen } from "@testing-library/react";

import type { SMTPFormValues } from "./smtp.types";
import { SMTPSenderSection } from "./SMTPSenderSection";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

describe("SMTPSenderSection", () => {
  const form: SMTPFormValues = {
    enabled: true, host: "", port: 587,
    username: "", password: "",
    tls: false, authMethod: "PLAIN",
    senderAddress: "noreply@test.com", senderName: "Zublo",
  };

  it("renders sender email and name fields", () => {
    render(<SMTPSenderSection form={form} setField={vi.fn()} />);
    expect(screen.getByText("smtp_from_email")).toBeInTheDocument();
    expect(screen.getByText("smtp_from_name")).toBeInTheDocument();
  });

  it("displays current values", () => {
    render(<SMTPSenderSection form={form} setField={vi.fn()} />);
    expect(screen.getByDisplayValue("noreply@test.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Zublo")).toBeInTheDocument();
  });

  it("calls setField on sender address change", () => {
    const setField = vi.fn();
    render(<SMTPSenderSection form={form} setField={setField} />);
    fireEvent.change(screen.getByDisplayValue("noreply@test.com"), { target: { value: "new@test.com" } });
    expect(setField).toHaveBeenCalledWith("senderAddress", "new@test.com");
  });
});
