import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import pb from "@/lib/pb";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Camera, KeyRound, Crown } from "lucide-react";
import type { AdminUser } from "./types";

export function avatarUrl(userId: string, avatar: string) {
  if (!avatar) return null;
  return `${pb.baseUrl}/api/files/users/${userId}/${avatar}`;
}

export function EditUserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username);
  const [email, setEmail] = useState(user.email);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(avatarUrl(user.id, user.avatar));
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setName(user.name);
    setUsername(user.username);
    setEmail(user.email);
    setPassword("");
    setPasswordConfirm("");
    setAvatarPreview(avatarUrl(user.id, user.avatar));
    setAvatarFile(null);
  }, [user]);

  const handleAvatarChange = (file: File) => {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    if (password && password !== passwordConfirm) {
      toast.error(t("passwords_no_match"));
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = { name, username, email };
      if (password) body.password = password;

      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("error"));
      }

      if (avatarFile) {
        const fd = new FormData();
        fd.set("avatar", avatarFile);
        const avatarRes = await fetch(`/api/admin/users/${user.id}/avatar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${pb.authStore.token}` },
          body: fd,
        });
        if (!avatarRes.ok) {
          const err = await avatarRes.json().catch(() => ({}));
          throw new Error(err.error || t("error"));
        }
      }

      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(t("saved"));
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("error"));
    } finally {
      setSaving(false);
    }
  };

  const displayName = name || username || email;
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

        <div className="space-y-6 pt-2">
          {/* Avatar */}
          <div className="flex items-center gap-5">
            <div className="relative group shrink-0">
              <button
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
              <p className="text-sm text-muted-foreground">{email}</p>
              <Button variant="outline" size="sm" className="rounded-xl mt-1" onClick={() => avatarInputRef.current?.click()}>
                {t("change_avatar")}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("name")}</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/50 rounded-xl" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("username")}</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-muted/50 rounded-xl" />
            </div>
            <div className="col-span-2 grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("email")}</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-muted/50 rounded-xl" />
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
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-muted/50 rounded-xl" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">{t("confirm_password")}</Label>
                <Input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} className="bg-muted/50 rounded-xl" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="rounded-xl">{t("cancel")}</Button>
            <Button onClick={save} disabled={saving} className="rounded-xl shadow-lg shadow-primary/20">
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
