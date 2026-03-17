import { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import pb from "@/lib/pb";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Camera, KeyRound } from "lucide-react";

export function AddUserModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const initials = (name || username || email)[0]?.toUpperCase() || "?";

  const handleAvatarChange = (file: File) => {
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const submit = async () => {
    if (!email || !password || !username) {
      toast.error(t("fill_required_fields") || "Fill in all required fields");
      return;
    }
    if (password !== passwordConfirm) {
      toast.error(t("passwords_no_match"));
      return;
    }
    setSaving(true);
    try {
      const record = await pb.collection("users").create({
        name, username, email, password, passwordConfirm, emailVisibility: true,
      });
      if (avatarFile) {
        const fd = new FormData();
        fd.set("avatar", avatarFile);
        await fetch(`/api/admin/users/${record.id}/avatar`, {
          method: "POST",
          headers: { Authorization: `Bearer ${pb.authStore.token}` },
          body: fd,
        });
      }
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(t("user_created"));
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : t("error"));
    } finally {
      setSaving(false);
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

        <div className="space-y-6 pt-2">
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
              <p className="font-semibold">{name || username || t("new_user") || "New user"}</p>
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
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/50 rounded-xl" />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("username")} *</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} className="bg-muted/50 rounded-xl" />
            </div>
            <div className="col-span-2 grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("email")} *</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-muted/50 rounded-xl" />
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
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-muted/50 rounded-xl" />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs text-muted-foreground">{t("confirm_password") || "Confirm"} *</Label>
                <Input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && submit()} className="bg-muted/50 rounded-xl" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose} className="rounded-xl">{t("cancel")}</Button>
            <Button onClick={submit} disabled={saving || !email || !username || !password || !passwordConfirm} className="rounded-xl shadow-lg shadow-primary/20">
              {saving ? t("saving") || "Saving…" : t("add_user")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
