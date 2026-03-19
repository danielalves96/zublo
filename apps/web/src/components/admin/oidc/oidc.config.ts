import type { AdminSettings } from "@/types";

export interface OIDCFieldDefinition {
  key: keyof AdminSettings;
  labelKey: string;
  placeholder?: string;
}

export const OIDC_FIELDS: OIDCFieldDefinition[] = [
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
];
