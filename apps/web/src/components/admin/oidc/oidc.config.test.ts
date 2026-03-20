import { OIDC_FIELDS } from "@/components/admin/oidc/oidc.config";

describe("oidc.config", () => {
  it("defines the editable OIDC fields in the expected order", () => {
    expect(OIDC_FIELDS).toEqual([
      {
        key: "oidc_provider_name",
        labelKey: "provider_name",
        placeholder: "oidc_provider_placeholder",
      },
      { key: "oidc_client_id", labelKey: "oidc_client_id" },
      {
        key: "oidc_issuer_url",
        labelKey: "oidc_issuer_url",
        placeholder: "https://accounts.example.com",
      },
      {
        key: "oidc_redirect_url",
        labelKey: "oidc_redirect_url",
        placeholder: "https://app.example.com/oidc/callback",
      },
      {
        key: "oidc_scopes",
        labelKey: "oidc_scopes",
        placeholder: "openid email profile",
      },
    ]);
  });
});
