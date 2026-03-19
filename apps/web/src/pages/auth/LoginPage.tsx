import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "@/lib/toast";
import { LogoWithName } from "@/components/AppLogo";

type LoginForm = {
  email: string;
  password: string;
};

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();

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
      const msg = err instanceof Error ? err.message : t("unknown_error");
      if (msg.includes("totp") || msg.includes("TOTP")) {
        navigate({ to: "/totp", state: { email: data.email, password: data.password } });
      } else {
        toast.error(msg);
      }
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
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("no_account")}{" "}
            <Link to="/register" className="text-primary hover:underline">
              {t("create_account")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
