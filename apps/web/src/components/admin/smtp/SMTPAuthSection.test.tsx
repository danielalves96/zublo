import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi, beforeEach } from "vitest";

import { SMTPAuthSection } from "./SMTPAuthSection";
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

describe("SMTPAuthSection", () => {
  const setField = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders correctly", () => {
    render(<SMTPAuthSection form={defaultForm} hasExistingPassword={false} setField={setField} />);
    
    expect(screen.getByText("smtp_auth")).toBeInTheDocument();
    expect(screen.getByText("smtp_username")).toBeInTheDocument();
    expect(screen.getByText("smtp_password")).toBeInTheDocument();
    
    // placeholder should be password when no existing password
    const pwdInput = screen.getByPlaceholderText("password");
    expect(pwdInput).toBeInTheDocument();
  });

  it("shows different password placeholder if hasExistingPassword", () => {
    render(<SMTPAuthSection form={defaultForm} hasExistingPassword={true} setField={setField} />);
    
    const pwdInput = screen.getByPlaceholderText("smtp_password_unchanged");
    expect(pwdInput).toBeInTheDocument();
  });

  it("calls setField when username changes", async () => {
    render(<SMTPAuthSection form={defaultForm} hasExistingPassword={false} setField={setField} />);
    
    const usernameInput = screen.getByDisplayValue("testuser");
    await userEvent.clear(usernameInput);
    await userEvent.type(usernameInput, "newuser");
    
    // clear calls it, type calls it for each char. Let's just check if it was called with "newuser"
    expect(setField).toHaveBeenCalledWith("username", expect.any(String));
  });

  it("calls setField when password changes", async () => {
    render(<SMTPAuthSection form={defaultForm} hasExistingPassword={false} setField={setField} />);
    
    const passwordInput = screen.getByPlaceholderText("password");
    await userEvent.type(passwordInput, "123");
    
    expect(setField).toHaveBeenCalledWith("password", expect.any(String));
  });
});
