import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "@tanstack/react-router";
import { Controller,useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { LogoWithName } from "@/components/AppLogo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import i18n from "@/lib/i18n";
import { toast } from "@/lib/toast";
import { authService } from "@/services/auth";
import { currenciesService } from "@/services/currencies";
import { usersService } from "@/services/users";

const COMMON_CURRENCIES = [
  { code: "USD", symbol: "$", name: "US Dollar" },
  { code: "EUR", symbol: "€", name: "Euro" },
  { code: "BRL", symbol: "R$", name: "Brazilian Real" },
  { code: "GBP", symbol: "£", name: "British Pound" },
  { code: "JPY", symbol: "¥", name: "Japanese Yen" },
  { code: "CAD", symbol: "CA$", name: "Canadian Dollar" },
  { code: "AUD", symbol: "A$", name: "Australian Dollar" },
  { code: "CHF", symbol: "CHF", name: "Swiss Franc" },
];

type RegisterForm = {
  username: string;
  email: string;
  password: string;
  passwordConfirm: string;
  currency: string;
  language: string;
};

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();

  const schema = z
    .object({
      username: z
        .string()
        .min(3, t("validation_min_chars", { count: 3 }))
        .max(50, t("validation_min_chars", { count: 50 })),
      email: z.string().min(1, t("required")).email(t("validation_invalid_email")),
      password: z.string().min(8, t("validation_min_chars", { count: 8 })),
      passwordConfirm: z.string().min(1, t("required")),
      currency: z.string().min(1, t("required")),
      language: z.string().min(1, t("required")),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: t("passwords_no_match"),
      path: ["passwordConfirm"],
    });

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      currency: "USD",
      language: i18n.language || "en",
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await authService.register({
        username: data.username,
        name: data.username,
        email: data.email,
        password: data.password,
        passwordConfirm: data.passwordConfirm,
        language: data.language,
      });
      const authData = await authService.loginWithPassword(data.email, data.password);
      const userId = authData.record.id;

      // Apply chosen currency preference (onboarding defaults to EUR)
      if (data.currency !== "EUR") {
        try {
          const currencies = await currenciesService.list(userId);
          const preferred = currencies.find((c) => c.code === data.currency);
          const eur = currencies.find((c) => c.code === "EUR");
          if (preferred) {
            if (eur) await currenciesService.update(eur.id, { is_main: false });
            await currenciesService.update(preferred.id, { is_main: true });
            await usersService.update(userId, { main_currency: preferred.id });
          }
        } catch {
          // non-fatal: user can change main currency in settings
        }
      }

      await refreshUser();
      toast.success(t("success"));
      navigate({ to: "/dashboard", replace: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("unknown_error");
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <LogoWithName className="h-10 w-auto" />
          </div>
          <CardDescription>{t("register")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t("username")}</Label>
              <Input id="username" {...register("username")} />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="passwordConfirm">{t("confirm_password")}</Label>
              <Input
                id="passwordConfirm"
                type="password"
                {...register("passwordConfirm")}
              />
              {errors.passwordConfirm && (
                <p className="text-sm text-destructive">{errors.passwordConfirm.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("main_currency")}</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_CURRENCIES.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.symbol} — {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("language")}</Label>
              <Controller
                name="language"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUPPORTED_LANGUAGES.map((l) => (
                        <SelectItem key={l.code} value={l.code}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? t("loading") : t("create_account")}
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("have_account")}{" "}
            <Link to="/login" className="text-primary hover:underline">
              {t("login")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
