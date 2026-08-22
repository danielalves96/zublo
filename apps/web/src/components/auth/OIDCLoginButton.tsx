import { KeyRound } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { SS_KEYS } from "@/lib/constants";
import { toast } from "@/lib/toast";
import { oidcService } from "@/services/oidc";

interface OIDCLoginButtonProps {
  providerName: string;
}

/**
 * Starts the OIDC authorization code flow: asks the backend for the provider
 * URL, remembers the issued state so the callback can validate it, then hands
 * the browser over to the provider.
 */
export function OIDCLoginButton({ providerName }: OIDCLoginButtonProps) {
  const { t } = useTranslation();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleClick = async () => {
    setIsRedirecting(true);
    try {
      const { authorizationUrl, state } = await oidcService.startAuthorization();
      sessionStorage.setItem(SS_KEYS.OIDC_LOGIN_STATE, state);
      window.location.assign(authorizationUrl);
    } catch (err: unknown) {
      setIsRedirecting(false);
      const msg = err instanceof Error ? err.message : t("unknown_error");
      toast.error(msg);
    }
  };

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      disabled={isRedirecting}
      onClick={handleClick}
    >
      <KeyRound className="w-4 h-4 mr-2" />
      {isRedirecting
        ? t("loading")
        : t("oidc_sign_in_with", { provider: providerName || t("oidc_provider_fallback") })}
    </Button>
  );
}
