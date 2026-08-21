import { api } from "@/lib/api";
import type { User } from "@/types";

interface OIDCConfigResponse {
  enabled: boolean;
  provider_name: string;
}

interface OIDCAuthorizeResponse {
  authorization_url: string;
  state: string;
}

interface OIDCCallbackResponse {
  token: string;
  record: User;
}

export interface OIDCConfig {
  enabled: boolean;
  providerName: string;
}

export interface OIDCAuthorization {
  authorizationUrl: string;
  state: string;
}

export const oidcService = {
  /** Public endpoint — tells the login page whether an SSO provider is ready. */
  getConfig: async (): Promise<OIDCConfig> => {
    const response = await api.get<OIDCConfigResponse>("/api/auth/oidc/config", {
      cache: "no-store",
    });
    return {
      enabled: !!response.enabled,
      providerName: response.provider_name ?? "",
    };
  },

  /** Returns the provider authorization URL plus the state the callback expects. */
  startAuthorization: async (): Promise<OIDCAuthorization> => {
    const response = await api.get<OIDCAuthorizeResponse>("/api/auth/oidc/authorize");
    return {
      authorizationUrl: response.authorization_url,
      state: response.state,
    };
  },

  completeAuthorization: (code: string, state: string) =>
    api.post<OIDCCallbackResponse>("/api/auth/oidc/callback", { code, state }),
};
