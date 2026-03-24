import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { SMTPSenderSection } from "./SMTPSenderSection";
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

describe("SMTPSenderSection", () => {
  const setField = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    render(<SMTPSenderSection form={defaultForm} setField={setField} />);
    
    expect(screen.getByText("smtp_sender")).toBeInTheDocument();
    expect(screen.getByText("smtp_from_email")).toBeInTheDocument();
    expect(screen.getByText("smtp_from_name")).toBeInTheDocument();
    
    expect(screen.getByDisplayValue("test@example.com")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Test Sender")).toBeInTheDocument();
  });

  it("calls setField when sender address changes", async () => {
    render(<SMTPSenderSection form={defaultForm} setField={setField} />);
    
    const input = screen.getByDisplayValue("test@example.com");
    await userEvent.clear(input);
    await userEvent.type(input, "new@example.com");
    
    expect(setField).toHaveBeenCalledWith("senderAddress", expect.any(String));
  });

  it("calls setField when sender name changes", async () => {
    render(<SMTPSenderSection form={defaultForm} setField={setField} />);
    
    const input = screen.getByDisplayValue("Test Sender");
    await userEvent.clear(input);
    await userEvent.type(input, "New Name");
    
    expect(setField).toHaveBeenCalledWith("senderName", expect.any(String));
  });
});
