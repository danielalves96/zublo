import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, KeyRound,Plus } from "lucide-react";
import { useRef } from "react";
import { useState } from "react";
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

export function AddUserModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const schema = z
    .object({
      name: z.string(),
      username: z.string().min(1, t("required")),
      email: z.string().min(1, t("required")).email(t("validation_invalid_email")),
      password: z.string().min(8, t("validation_min_chars", { count: 8 })),
      passwordConfirm: z.string().min(1, t("required")),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: t("passwords_no_match"),
      path: ["passwordConfirm"],
    });

  type AddUserForm = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AddUserForm>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", username: "", email: "", password: "", passwordConfirm: "" },
  });

  const [name, username, email] = watch(["name", "username", "email"]);
  const initials = (name || username || email || "?")?.[0]?.toUpperCase() ?? "?";

  const handleAvatarChange = (file: File) => {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: AddUserForm) => {
    try {
      const record = await adminService.createUser({
        name: data.name,
        username: data.username,
        email: data.email,
        password: data.password,
        passwordConfirm: data.passwordConfirm,
      });
      if (avatarFile) {
        const fd = new FormData();
        fd.set("avatar", avatarFile);
        await adminService.uploadAvatar(record.id, fd);
      }
      qc.invalidateQueries({ queryKey: queryKeys.admin.users() });
      toast.success(t("user_created"));
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("error"));
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            {t("add_user")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-2">
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
              <p className="font-semibold">{name || username || t("new_user")}</p>
              <p className="text-sm text-muted-foreground">{email || t("email")}</p>
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
              <Label className="text-xs text-muted-foreground">{t("username")} *</Label>
              <Input {...register("username")} className="bg-muted/50 rounded-xl" />
              {errors.username && (
                <p className="text-xs text-destructive">{errors.username.message}</p>
              )}
            </div>
            <div className="col-span-2 grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("email")} *</Label>
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
              {t("password")}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">{t("password")} *</Label>
                <Input type="password" {...register("password")} className="bg-muted/50 rounded-xl" />
                {errors.password && (
                  <p className="text-xs text-destructive">{errors.password.message}</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">{t("confirm_password")} *</Label>
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
              {isSubmitting ? t("saving") : t("add_user")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
