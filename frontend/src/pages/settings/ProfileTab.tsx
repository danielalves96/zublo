import { useState, useRef, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import pb from "@/lib/pb";
import { toast } from "@/lib/toast";
import { SUPPORTED_LANGUAGES } from "@/lib/i18n";
import i18n from "@/lib/i18n";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Camera, Save, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Currency } from "@/types";

function useUserMutation() {
  const { user, refreshUser } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => pb.collection("users").update(user!.id, data),
    onSuccess: () => {
      refreshUser();
      qc.invalidateQueries({ queryKey: ["user"] });
    },
  });
}

export function ProfileTab() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const [username, setUsername] = useState(user?.name || user?.username || "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confPwd, setConfPwd] = useState("");
  const [lang, setLang] = useState(user?.language ?? "en");
  const [budget, setBudget] = useState<number>(user?.budget ?? 0);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const { data: mainCurrency } = useQuery<Currency | undefined>({
    queryKey: ["main-currency", user?.id],
    queryFn: async () => {
      const list = await pb.collection("currencies").getFullList<Currency>({
        filter: `user = "${user!.id}" && is_main = true`,
      });
      return list[0];
    },
    enabled: !!user?.id,
  });
  const [preview, setPreview] = useState<string | null>(null);
  
  useEffect(() => {
    if (user?.avatar) {
      setPreview(pb.files.getUrl(user, user.avatar));
    }
  }, [user]);
  
  const fileRef = useRef<HTMLInputElement>(null);
  const mut = useUserMutation();

  const save = async () => {
    try {
      const fd = new FormData();
      fd.set("name", username);
      fd.set("email", email);
      fd.set("language", lang);
      fd.set("budget", String(budget || 0));
      if (oldPwd && newPwd) {
        if (newPwd !== confPwd) {
          toast.error(t("passwords_no_match"));
          return;
        }
        fd.set("oldPassword", oldPwd);
        fd.set("password", newPwd);
        fd.set("passwordConfirm", confPwd);
      }
      if (avatarFile) fd.set("avatar", avatarFile);
      await pb.collection("users").update(user!.id, fd);
      i18n.changeLanguage(lang);
      await refreshUser();
      toast.success(t("saved"));
      
      // Clear password fields on success
      setOldPwd("");
      setNewPwd("");
      setConfPwd("");
    } catch (e: any) {
      toast.error(e.message || String(e));
    }
  };

  const handleAvatar = (f: File) => {
    setAvatarFile(f);
    setPreview(URL.createObjectURL(f));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">{t("profile")}</h2>
        <p className="text-muted-foreground">Manage your personal information and preferences.</p>
      </div>

      <Separator />

      <div className="space-y-8">
        {/* Avatar Section */}
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start p-6 rounded-2xl border bg-card/50 shadow-sm">
          <div className="relative group shrink-0">
            <button
              onClick={() => fileRef.current?.click()}
              className="h-24 w-24 rounded-full overflow-hidden border-4 border-background shadow-lg transition-transform group-hover:scale-105"
            >
              {preview ? (
                <img src={preview} alt="avatar" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary">
                  {username[0]?.toUpperCase() || "U"}
                </div>
              )}
            </button>
            <button
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
            <h3 className="font-semibold text-xl">{username || "User"}</h3>
            <p className="text-sm text-muted-foreground">{email}</p>
            <Button variant="outline" size="sm" className="mt-4 rounded-xl" onClick={() => fileRef.current?.click()}>
              {t("change_avatar")}
            </Button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Basic Information</h3>
          <div className="grid gap-2">
            <Label>{t("username")}</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your name"
              className="bg-muted/50 border-white/5 focus:bg-background rounded-xl"
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("email")}</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="bg-muted/50 border-white/5 focus:bg-background rounded-xl"
            />
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
          <p className="text-sm text-muted-foreground mb-4">Ensure your account is using a long, random password to stay secure.</p>
          <div className="grid gap-2">
            <Label>{t("old_password")}</Label>
            <Input
              type="password"
              value={oldPwd}
              onChange={(e) => setOldPwd(e.target.value)}
              className="bg-muted/50 border-white/5 focus:bg-background rounded-xl"
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("new_password")}</Label>
            <Input
              type="password"
              value={newPwd}
              onChange={(e) => setNewPwd(e.target.value)}
              className="bg-muted/50 border-white/5 focus:bg-background rounded-xl"
            />
          </div>
          <div className="grid gap-2">
            <Label>{t("confirm_password")}</Label>
            <Input
              type="password"
              value={confPwd}
              onChange={(e) => setConfPwd(e.target.value)}
              className="bg-muted/50 border-white/5 focus:bg-background rounded-xl"
            />
          </div>
        </div>

        <Separator />

        {/* Preferences */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Preferences</h3>
          <div className="grid gap-2">
            <Label>{t("language")}</Label>
            <Select value={lang} onValueChange={setLang}>
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
          </div>
        </div>

      </div>
      
      {/* Absolute floating Action Bar at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-card via-card to-transparent flex justify-end">
        <Button
          size="lg"
          onClick={save}
          disabled={mut.isPending}
          className="shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all rounded-xl px-8"
        >
          <Save className="w-4 h-4 mr-2" />
          {t("save")}
        </Button>
      </div>
    </div>
  );
}
