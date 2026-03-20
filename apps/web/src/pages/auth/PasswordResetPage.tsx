import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { authService } from "@/services/auth";

type PasswordResetForm = {
  email: string;
};

export function PasswordResetPage() {
  const { t } = useTranslation();
  const [sent, setSent] = useState(false);

  const schema = z.object({
    email: z.string().min(1, t("required")).email(t("validation_invalid_email")),
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PasswordResetForm>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: PasswordResetForm) => {
    try {
      await authService.requestPasswordReset(data.email);
      setSent(true);
      toast.success(t("success"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("unknown_error");
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle>{t("reset_password")}</CardTitle>
          <CardDescription>
            {sent ? t("reset_email_check") : t("reset_email_enter")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!sent ? (
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
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? t("loading") : t("send_reset_link")}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground text-center">
              {t("reset_email_sent")}
            </p>
          )}
          <p className="mt-4 text-center text-sm">
            <Link to="/login" className="text-primary hover:underline">
              {t("back_to_login")}
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
