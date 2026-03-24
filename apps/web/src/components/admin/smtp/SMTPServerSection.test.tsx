import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { SMTPServerSection } from "./SMTPServerSection";
import type { SMTPFormValues } from "./smtp.types";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const defaultForm: SMTPFormValues = {
  host: "smtp.example.com",
  port: 587,
  tls: true,
  username: "testuser",
  password: "testpassword",
  senderAddress: "test@example.com",
  senderName: "Test Sender",
};

describe("SMTPServerSection", () => {
  const setField = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    render(<SMTPServerSection form={defaultForm} setField={setField} />);
    
    expect(screen.getByText("smtp_server")).toBeInTheDocument();
    expect(screen.getByText("smtp_address")).toBeInTheDocument();
    expect(screen.getByText("smtp_port")).toBeInTheDocument();
    expect(screen.getByText("TLS")).toBeInTheDocument();
    expect(screen.getByText("smtp_tls_description")).toBeInTheDocument();
    
    expect(screen.getByDisplayValue("smtp.example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("587")).toBeInTheDocument();
    expect(screen.getByRole("switch")).toBeChecked();
  });

  it("calls setField when host changes", async () => {
    render(<SMTPServerSection form={defaultForm} setField={setField} />);
    
    const input = screen.getByDisplayValue("smtp.example.com");
    await userEvent.clear(input);
    await userEvent.type(input, "new.example.com");
    
    expect(setField).toHaveBeenCalledWith("host", expect.any(String));
  });

  it("calls setField when port changes", async () => {
    render(<SMTPServerSection form={defaultForm} setField={setField} />);
    
    const input = screen.getByDisplayValue("587");
    await userEvent.clear(input);
    await userEvent.type(input, "465");
    
    expect(setField).toHaveBeenCalledWith("port", expect.any(Number));
  });

  it("calls setField when TLS switch changes", async () => {
    render(<SMTPServerSection form={defaultForm} setField={setField} />);
    
    const switchBtn = screen.getByRole("switch");
    await userEvent.click(switchBtn);
    
    expect(setField).toHaveBeenCalledWith("tls", false); // toggled off
  });
});
