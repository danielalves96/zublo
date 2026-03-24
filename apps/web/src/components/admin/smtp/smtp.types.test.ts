import type { SMTPFormValues } from "./smtp.types";

describe("smtp.types", () => {
  it("exports SMTPFormValues type", () => {
    const values: SMTPFormValues = {
      enabled: true,
      host: "smtp.example.com",
      port: 587,
      username: "user",
      password: "pass",
      tls: true,
      authMethod: "LOGIN",
      senderAddress: "a@b.com",
      senderName: "Test",
    };
    expect(values.host).toBe("smtp.example.com");
  });
});
