import { useRef, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/toast";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import i18n from "@/lib/i18n";
import { usersService } from "@/services/users";
import { currenciesService } from "@/services/currencies";
import { queryKeys } from "@/lib/queryKeys";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Camera, Save, Wallet } from "lucide-react";
import { compressImage } from "@/lib/image";
import type { Currency } from "@/types";
import { Controller } from "react-hook-form";

export function ProfileTab() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [budget, setBudget] = useState<number>(user?.budget ?? 0);

  const { data: mainCurrency } = useQuery<Currency | undefined>({
    queryKey: queryKeys.mainCurrency(user?.id ?? ""),
    queryFn: async () => {
      const list = await currenciesService.listMain(user!.id);
      return list[0];
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (user) {
      const url = usersService.avatarUrl(user);
      if (url) setPreview(url);
      setBudget(user.budget ?? 0);
    }
  }, [user]);

  const schema = z
    .object({
      username: z.string().min(1, t("required")),
      email: z.string().min(1, t("required")).email(t("validation_invalid_email")),
      oldPwd: z.string(),
      newPwd: z.string(),
      confPwd: z.string(),
      language: z.string().min(1, t("required")),
    })
    .refine(
      (data) => !data.newPwd || data.newPwd.length >= 8,
      { message: t("validation_min_chars", { count: 8 }), path: ["newPwd"] }
    )
    .refine(
      (data) => !data.newPwd || data.newPwd === data.confPwd,
      { message: t("passwords_no_match"), path: ["confPwd"] }
    )
    .refine(
      (data) => !data.newPwd || !!data.oldPwd,
      { message: t("required"), path: ["oldPwd"] }
    );

  type ProfileForm = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      username: user?.name || user?.username || "",
      email: user?.email ?? "",
      oldPwd: "",
      newPwd: "",
      confPwd: "",
      language: user?.language ?? "en",
    },
  });

  const mut = useMutation({
    mutationFn: (data: Record<string, unknown>) => usersService.update(user!.id, data),
    onSuccess: () => {
      refreshUser();
      qc.invalidateQueries({ queryKey: queryKeys.user() });
    },
  });

  const onSubmit = async (data: ProfileForm) => {
    try {
      const fd = new FormData();
      fd.set("name", data.username);
      fd.set("email", data.email);
      fd.set("language", data.language);
      fd.set("budget", String(budget || 0));
      if (data.oldPwd && data.newPwd) {
        fd.set("oldPassword", data.oldPwd);
        fd.set("password", data.newPwd);
        fd.set("passwordConfirm", data.confPwd);
      }
      if (avatarFile) fd.set("avatar", avatarFile);
      await usersService.update(user!.id, fd);
      i18n.changeLanguage(data.language);
      await refreshUser();
      toast.success(t("saved"));
      reset({ ...data, oldPwd: "", newPwd: "", confPwd: "" });
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : String(e));
    }
  };

  const handleAvatar = async (f: File) => {
    const compressed = await compressImage(f, { maxSize: 512 });
    setAvatarFile(compressed);
    setPreview(URL.createObjectURL(compressed));
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">{t("profile")}</h2>
        <p className="text-muted-foreground">{t("profile_desc")}</p>
      </div>

      <Separator />

      <div className="space-y-8">
        {/* Avatar Section */}
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start p-6 rounded-2xl border bg-card/50 shadow-sm">
          <div className="relative group shrink-0">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-24 w-24 rounded-full overflow-hidden border-4 border-background shadow-lg transition-transform group-hover:scale-105"
            >
              {preview ? (
                <img src={preview} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                  {(user?.name || user?.username || "U")[0]?.toUpperCase()}
                </div>
              )}
            </button>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-2.5 bg-primary text-primary-foreground rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform duration-200"
            >
              <Camera className="w-4 h-4" />
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleAvatar(e.target.files[0])}
            />
          </div>
          <div className="text-center sm:text-left space-y-2 flex-1 pt-2">
            <h3 className="font-semibold text-xl">{user?.name || user?.username || t("user")}</h3>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            <Button variant="outline" size="sm" className="mt-4 rounded-xl" type="button" onClick={() => fileRef.current?.click()}>
              {t("change_avatar")}
            </Button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t("basic_information")}</h3>
          <div className="grid gap-2">
            <Label>{t("username")}</Label>
            <Input
              {...register("username")}
              placeholder={t("your_name_placeholder")}
              className="bg-muted/50 border-white/5 focus:bg-background rounded-xl"
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>{t("email")}</Label>
            <Input
              type="email"
              {...register("email")}
              placeholder="your.email@example.com"
              className="bg-muted/50 border-white/5 focus:bg-background rounded-xl"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Monthly Budget */}
        <div className="rounded-2xl border bg-card/50 p-5 space-y-3 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Wallet className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-base leading-tight">{t("monthly_budget")}</h3>
              <p className="text-xs text-muted-foreground">{t("budget_hint")}</p>
            </div>
          </div>
          <CurrencyInput
            value={budget}
            onChange={setBudget}
            symbol={mainCurrency?.symbol}
            code={mainCurrency?.code}
            className="text-lg"
          />
        </div>

        <Separator />

        {/* Change Password */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t("change_password")}</h3>
          <p className="text-sm text-muted-foreground mb-4">{t("password_security_hint")}</p>
          <div className="grid gap-2">
            <Label>{t("old_password")}</Label>
            <Input
              type="password"
              {...register("oldPwd")}
              className="bg-muted/50 border-white/5 focus:bg-background rounded-xl"
            />
            {errors.oldPwd && (
              <p className="text-sm text-destructive">{errors.oldPwd.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>{t("new_password")}</Label>
            <Input
              type="password"
              {...register("newPwd")}
              className="bg-muted/50 border-white/5 focus:bg-background rounded-xl"
            />
            {errors.newPwd && (
              <p className="text-sm text-destructive">{errors.newPwd.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>{t("confirm_password")}</Label>
            <Input
              type="password"
              {...register("confPwd")}
              className="bg-muted/50 border-white/5 focus:bg-background rounded-xl"
            />
            {errors.confPwd && (
              <p className="text-sm text-destructive">{errors.confPwd.message}</p>
            )}
          </div>
        </div>

        <Separator />

        {/* Preferences */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t("preferences")}</h3>
          <div className="grid gap-2">
            <Label>{t("language")}</Label>
            <Controller
              name="language"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="bg-muted/50 border-white/5 focus:bg-background rounded-xl">
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
        </div>
      </div>

      {/* Absolute floating Action Bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-card via-card to-transparent flex justify-end">
        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting || mut.isPending}
          className="shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all rounded-xl px-8"
        >
          <Save className="w-4 h-4 mr-2" />
          {t("save")}
        </Button>
      </div>
    </form>
  );
}
