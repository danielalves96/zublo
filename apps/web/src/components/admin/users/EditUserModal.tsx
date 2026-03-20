import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Crown,KeyRound, Pencil } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { adminService } from "@/services/admin";

import type { AdminUser } from "./types";

export function avatarUrl(userId: string, avatar: string) {
  if (!avatar) return null;
  return adminService.avatarUrl(userId, avatar);
}

export function EditUserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl(user.id, user.avatar));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const schema = z
    .object({
      name: z.string(),
      username: z.string().min(1, t("required")),
      email: z.string().min(1, t("required")).email(t("validation_invalid_email")),
      password: z.string(),
      passwordConfirm: z.string(),
    })
    .refine(
      (data) => !data.password || data.password.length >= 8,
      { message: t("validation_min_chars", { count: 8 }), path: ["password"] }
    )
    .refine(
      (data) => !data.password || data.password === data.passwordConfirm,
      { message: t("passwords_no_match"), path: ["passwordConfirm"] }
    );

  type EditUserForm = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditUserForm>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user.name,
      username: user.username,
      email: user.email,
      password: "",
      passwordConfirm: "",
    },
  });

  useEffect(() => {
    reset({
      name: user.name,
      username: user.username,
      email: user.email,
      password: "",
      passwordConfirm: "",
    });
    setAvatarPreview(avatarUrl(user.id, user.avatar));
    setAvatarFile(null);
  }, [user, reset]);

  const handleAvatarChange = (file: File) => {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: EditUserForm) => {
    try {
      const body: Record<string, string> = {
        name: data.name,
        username: data.username,
        email: data.email,
      };
      if (data.password) body.password = data.password;

      await adminService.updateUser(user.id, body);

      if (avatarFile) {
        const fd = new FormData();
        fd.set("avatar", avatarFile);
        await adminService.uploadAvatar(user.id, fd);
      }

      qc.invalidateQueries({ queryKey: queryKeys.admin.users() });
      toast.success(t("saved"));
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("error"));
    }
  };

  const displayName = user.name || user.username || user.email;
  const initials = displayName[0]?.toUpperCase() || "U";

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="w-4 h-4" />
            {t("edit_user")}
            {user.is_admin && (
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Crown className="w-3 h-3" /> {t("admin")}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2">
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative group shrink-0">
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="h-20 w-20 rounded-full overflow-hidden border-4 border-background shadow-md transition-transform group-hover:scale-105"
              >
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                    {initials}
                  </div>
                )}
              </button>
              <button
                type="button"
                onClick={() => avatarInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-2 bg-primary text-primary-foreground rounded-full shadow scale-0 group-hover:scale-100 transition-transform duration-200"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleAvatarChange(e.target.files[0])}
              />
            </div>
            <div className="space-y-1">
              <p className="font-semibold">{displayName}</p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Button variant="outline" size="sm" className="rounded-xl mt-1" type="button" onClick={() => avatarInputRef.current?.click()}>
                {t("change_avatar")}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("name")}</Label>
              <Input {...register("name")} className="bg-muted/50 rounded-xl" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("username")}</Label>
              <Input {...register("username")} className="bg-muted/50 rounded-xl" />
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              )}
            </div>
            <div className="col-span-2 grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("email")}</Label>
              <Input type="email" {...register("email")} className="bg-muted/50 rounded-xl" />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              {t("change_password")}
              <span className="text-xs font-normal text-muted-foreground">({t("optional")})</span>
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">{t("new_password")}</Label>
                <Input type="password" {...register("password")} className="bg-muted/50 rounded-xl" />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">{t("confirm_password")}</Label>
                <Input type="password" {...register("passwordConfirm")} className="bg-muted/50 rounded-xl" />
                {errors.passwordConfirm && (
                  <p className="text-xs text-destructive">{errors.passwordConfirm.message}</p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">{t("cancel")}</Button>
            <Button type="submit" disabled={isSubmitting} className="rounded-xl shadow-lg shadow-primary/20">
              {isSubmitting ? t("saving") : t("save")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
