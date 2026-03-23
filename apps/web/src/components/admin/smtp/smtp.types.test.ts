import type { SMTPFormValues } from "./smtp.types";

describe("smtp.types", () => {
  it("SMTPFormValues can be constructed with all required fields", () => {
    const form: SMTPFormValues = {
      enabled: true,
      host: "smtp.example.com",
      port: 587,
      username: "user",
      password: "pass",
      tls: true,
      authMethod: "PLAIN",
      senderAddress: "noreply@example.com",
      senderName: "Zublo",
    };
    expect(form.enabled).toBe(true);
    expect(form.host).toBe("smtp.example.com");
    expect(form.port).toBe(587);
  });
});
