import { LS_KEYS, SS_KEYS } from "./constants";

describe("constants", () => {
  it("exports the expected localStorage keys", () => {
    expect(LS_KEYS.LANGUAGE).toBe("zublo_language");
    expect(LS_KEYS.COLOR_THEME).toBe("zublo_color_theme");
  });

  it("builds the trusted TOTP device key per user", () => {
    expect(LS_KEYS.totpTrusted("user-123")).toBe("totp_trusted_user-123");
  });

  it("exports the expected sessionStorage keys", () => {
    expect(SS_KEYS.TOTP_LOGIN_CHALLENGE).toBe("zublo_totp_login_challenge");
  });
});
