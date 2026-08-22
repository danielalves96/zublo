import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { LogoWithName } from "@/components/AppLogo";
import { OIDCLoginButton } from "@/components/auth/OIDCLoginButton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { SS_KEYS } from "@/lib/constants";
import { toast } from "@/lib/toast";
import { isTotpRequiredError } from "@/services/auth";
import { oidcService } from "@/services/oidc";
import { registrationService } from "@/services/registration";

type LoginForm = {
  email: string;
  password: string;
};

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [oidcProviderName, setOidcProviderName] = useState<string | null>(null);
  // null until the server answers, so a closed instance never flashes the link.
  const [registrationOpen, setRegistrationOpen] = useState<boolean | null>(null);

  const schema = z.object({
    email: z.string().min(1, t("required")).email(t("validation_invalid_email")),
    password: z.string().min(1, t("required")),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      navigate({ to: "/dashboard", replace: true });
    } catch (err: unknown) {
      if (isTotpRequiredError(err)) {
        sessionStorage.setItem(SS_KEYS.TOTP_LOGIN_CHALLENGE, JSON.stringify(err.challenge));
        navigate({ to: "/totp", replace: true });
        return;
      }

      const msg = err instanceof Error ? err.message : t("unknown_error");
      toast.error(msg);
    }
  };

  useEffect(() => {
    fetch("/api/auth/bootstrap-status", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.hasUsers === false) {
          navigate({ to: "/register", replace: true });
        }
      })
      .catch(() => {});
  }, [navigate]);

  useEffect(() => {
    registrationService
      .isOpen()
      .then(setRegistrationOpen)
      // The backend enforces the policy on the create request either way, so
      // an unreachable check falls back to offering the link.
      .catch(() => setRegistrationOpen(true));
  }, []);

  // The OIDC settings are admin-only, so the login page asks the public
  // endpoint whether an SSO provider is configured.
  useEffect(() => {
    oidcService
      .getConfig()
      .then((config) => {
        if (config.enabled) setOidcProviderName(config.providerName);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <LogoWithName className="h-10 w-auto" />
          </div>
          <CardDescription>{t("login")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="flex items-center justify-between text-sm">
              <Link
                to="/password-reset"
                className="text-muted-foreground hover:text-primary"
              >
                {t("forgot_password")}
              </Link>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t("loading") : t("login")}
            </Button>
          </form>
          {oidcProviderName !== null && (
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs uppercase text-muted-foreground">{t("or")}</span>
                <span className="h-px flex-1 bg-border" />
              </div>
              <OIDCLoginButton providerName={oidcProviderName} />
            </div>
          )}
          {registrationOpen && (
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {t("no_account")}{" "}
              <Link to="/register" className="text-primary hover:underline">
                {t("create_account")}
              </Link>
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
