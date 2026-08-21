import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

import { LogoWithName } from "@/components/AppLogo";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { SS_KEYS } from "@/lib/constants";
import { toast } from "@/lib/toast";
import { authService } from "@/services/auth";
import { oidcService } from "@/services/oidc";

function readStoredOidcState(): string | null {
  const state = sessionStorage.getItem(SS_KEYS.OIDC_LOGIN_STATE);
  sessionStorage.removeItem(SS_KEYS.OIDC_LOGIN_STATE);
  return state;
}

export function OIDCCallbackPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  // The provider redirects here only once — guard against the effect running
  // twice (StrictMode) and consuming the stored state a second time.
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const failLogin = (message: string) => {
      toast.error(message);
      navigate({ to: "/login", replace: true });
    };

    // The redirect URL is owned by the provider, so the query string is read
    // straight from the browser instead of the router search params.
    const params = new URLSearchParams(window.location.search);
    const providerError = params.get("error");
    const code = params.get("code");
    const state = params.get("state");
    const expectedState = readStoredOidcState();

    if (providerError) return failLogin(providerError);
    if (!code || !state || state !== expectedState) {
      return failLogin(t("oidc_login_failed"));
    }

    oidcService
      .completeAuthorization(code, state)
      .then(async (authData) => {
        authService.saveSession(authData.token, authData.record);
        await refreshUser();
        navigate({ to: "/dashboard", replace: true });
      })
      .catch((err: unknown) => {
        failLogin(err instanceof Error ? err.message : t("unknown_error"));
      });
  }, [navigate, refreshUser, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <LogoWithName className="h-10 w-auto" />
          </div>
          <CardDescription>{t("oidc_signing_in")}</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </CardContent>
      </Card>
    </div>
  );
}
