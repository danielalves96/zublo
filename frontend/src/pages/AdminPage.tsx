import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import pb from "@/lib/pb";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Trash2, Plus, Download, Upload, Pencil, Camera, KeyRound,
  Mail, Settings, ShieldCheck, Database, CalendarClock, Wrench,
  Users, Shield, ServerCrash, Play, Crown,
} from "lucide-react";
import type { AdminSettings } from "@/types";

// ─── types ────────────────────────────────────────────────────────────────────
interface AdminUser {
  id: string;
  username: string;
  name: string;
  email: string;
  avatar: string;
  created: string;
  totp_enabled: boolean;
  is_admin: boolean;
}

function avatarUrl(userId: string, avatar: string) {
  if (!avatar) return null;
  return `${pb.baseUrl}/api/files/users/${userId}/${avatar}`;
}

// ─── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
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
      // Update profile data
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

      // Upload avatar if changed
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
            Edit user
            {user.is_admin && (
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Crown className="w-3 h-3" /> Admin
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

          {/* Profile fields */}
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

          {/* Password change */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-muted-foreground" />
              {t("change_password")}
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
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
            <Button variant="outline" onClick={onClose} className="rounded-xl">Cancel</Button>
            <Button onClick={save} disabled={saving} className="rounded-xl shadow-lg shadow-primary/20">
              {saving ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Add User Modal ────────────────────────────────────────────────────────────
function AddUserModal({ onClose }: { onClose: () => void }) {
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
              <p className="font-semibold">{name || username || t("new_user") || "New user"}</p>
              <p className="text-sm text-muted-foreground">{email || t("email")}</p>
              <Button variant="outline" size="sm" className="rounded-xl mt-1" type="button" onClick={() => avatarInputRef.current?.click()}>
                {t("change_avatar")}
              </Button>
            </div>
          </div>

          <Separator />

          {/* Profile fields */}
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

          {/* Password */}
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

// ─── Users management ─────────────────────────────────────────────────────────
function UsersTab() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();

  const [addingUser, setAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      if (!res.ok) throw new Error("Failed to load users");
      return res.json();
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || t("error"));
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(t("success_delete"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      {addingUser && <AddUserModal onClose={() => setAddingUser(false)} />}
      {editingUser && (
        <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />
      )}

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            {t("users")}
          </h2>
          <p className="text-muted-foreground">{t("manage_users") || "Manage users and their access."}</p>
        </div>

        <Separator />

        <div className="space-y-4">
          {/* Users list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{users.length} {t("users").toLowerCase()}</span>
              <Button className="rounded-xl gap-2" onClick={() => setAddingUser(true)}>
                <Plus className="w-4 h-4" />
                {t("add_user")}
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-muted/50 animate-pulse" />)}
              </div>
            ) : (
              <ul className="space-y-2">
                {users.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const display = u.name || u.username || u.email;
                  const initials = display[0]?.toUpperCase() || "U";
                  const avatar = avatarUrl(u.id, u.avatar);

                  return (
                    <li
                      key={u.id}
                      className="flex items-center gap-4 rounded-2xl border bg-card hover:bg-muted/30 p-3 transition-colors group"
                    >
                      {/* Avatar */}
                      <div className="h-11 w-11 shrink-0 rounded-full overflow-hidden ring-2 ring-background shadow-sm">
                        {avatar ? (
                          <img src={avatar} alt={display} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-primary/10 flex items-center justify-center text-base font-bold text-primary">
                            {initials}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">{display}</p>
                          {u.is_admin && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1 shrink-0">
                              <Crown className="w-2.5 h-2.5" /> Admin
                            </span>
                          )}
                          {isSelf && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                              You
                            </span>
                          )}
                          {u.totp_enabled && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 shrink-0">
                              2FA
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        {u.username && u.username !== display && (
                          <p className="text-xs text-muted-foreground truncate">@{u.username}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-foreground hover:bg-muted"
                          onClick={() => setEditingUser(u)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
                          onClick={() => {
                            if (confirm(t("confirm_delete"))) deleteUser.mutate(u.id);
                          }}
                          disabled={isSelf}
                          title={isSelf ? "Cannot delete yourself" : t("delete")}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Registration settings ────────────────────────────────────────────────────
function RegistrationTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      if (!res.ok) return null;
      return res.json() as Promise<AdminSettings | null>;
    },
  });

  const save = useMutation({
    mutationFn: (data: Partial<AdminSettings>) =>
      fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success(t("saved"));
    },
  });

  const toggles: { key: keyof AdminSettings; label: string; description?: string }[] = [
    { key: "open_registrations", label: t("open_registrations"), description: "Allow new users to self-register." },
    { key: "require_email_validation", label: t("require_email_validation"), description: "Require email verification before login." },
    { key: "disable_login", label: t("disable_login"), description: "Disable all logins (lockdown mode)." },
    { key: "update_notification", label: t("update_notifications"), description: "Notify admin about new app versions." },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Settings className="w-8 h-8 text-primary" />
          {t("registration")}
        </h2>
        <p className="text-muted-foreground">{t("registration_settings") || "Manage registration flow and server options."}</p>
      </div>

      <Separator />

      <div className="space-y-8">
        <div className="space-y-3">
          {toggles.map(({ key, label, description }) => (
            <div
              key={key as string}
              className="flex items-center justify-between rounded-2xl border bg-card hover:bg-muted/30 p-4 transition-colors"
            >
              <div className="space-y-0.5">
                <Label className="text-sm font-medium">{label}</Label>
                {description && <p className="text-xs text-muted-foreground">{description}</p>}
              </div>
              <Switch
                checked={!!settings?.[key]}
                onCheckedChange={(c) => save.mutate({ [key]: c } as Partial<AdminSettings>)}
              />
            </div>
          ))}
        </div>

        <Separator />

        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Limits &amp; URLs</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-sm font-medium">{t("max_users")}</Label>
              <Input
                type="number"
                defaultValue={settings?.max_users ?? 0}
                onBlur={(e) => save.mutate({ max_users: Number(e.target.value) })}
                className="bg-muted/50 rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-sm font-medium">{t("server_url")}</Label>
              <Input
                defaultValue={settings?.server_url ?? ""}
                onBlur={(e) => save.mutate({ server_url: e.target.value })}
                className="bg-muted/50 rounded-xl"
                placeholder="https://app.example.com"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SMTP ─────────────────────────────────────────────────────────────────────
function SMTPTab() {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [form, setForm] = useState({
    enabled: false,
    host: "",
    port: 587,
    username: "",
    password: "",
    tls: false,
    authMethod: "PLAIN",
    senderAddress: "",
    senderName: "",
  });
  const [hasExistingPassword, setHasExistingPassword] = useState(false);

  useQuery({
    queryKey: ["admin-smtp"],
    queryFn: async () => {
      const res = await fetch("/api/admin/smtp", {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      if (!res.ok) throw new Error("Failed to load SMTP settings");
      const data = await res.json();
      setForm({
        enabled: !!data.enabled,
        host: data.host || "",
        port: data.port || 587,
        username: data.username || "",
        password: "",
        tls: !!data.tls,
        authMethod: data.authMethod || "PLAIN",
        senderAddress: data.senderAddress || "",
        senderName: data.senderName || "",
      });
      setHasExistingPassword(!!data.hasPassword);
      return data;
    },
  });

  const set = (field: string, value: unknown) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const save = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = { ...form };
      if (!form.password) delete body.password;
      const res = await fetch("/api/admin/smtp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(t("saved"));
        if (form.password) setHasExistingPassword(true);
        setForm((prev) => ({ ...prev, password: "" }));
      } else {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        toast.error(err.error || t("error"));
      }
    } catch {
      toast.error(t("error"));
    } finally {
      setSaving(false);
    }
  };

  const testEmail = async () => {
    setTesting(true);
    try {
      const res = await fetch("/api/admin/smtp/test", {
        method: "POST",
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      const data = await res.json();
      if (res.ok) toast.success(data.message || t("test_sent"));
      else toast.error(data.error || t("error"));
    } catch {
      toast.error(t("error"));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Mail className="w-8 h-8 text-primary" />
          SMTP
        </h2>
        <p className="text-muted-foreground">{t("smtp_settings") || "Configure outbound email delivery."}</p>
      </div>

      <Separator />

      <div className="space-y-8">
        {/* Enable toggle */}
        <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div>
            <Label className="font-semibold text-primary">{t("enabled")}</Label>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("smtp_enable_description") || "Send email notifications and account emails."}
            </p>
          </div>
          <Switch checked={form.enabled} onCheckedChange={(v) => set("enabled", v)} />
        </div>

        {/* Server */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t("smtp_server") || "Server"}</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_address")}</Label>
              <Input
                placeholder="smtp.example.com"
                value={form.host}
                onChange={(e) => set("host", e.target.value)}
                className="bg-muted/50 rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_port")}</Label>
              <Input
                type="number"
                placeholder="587"
                value={form.port}
                onChange={(e) => set("port", Number(e.target.value))}
                className="bg-muted/50 rounded-xl"
              />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-2xl border bg-card hover:bg-muted/30 p-4 transition-colors">
            <div>
              <Label className="text-sm font-medium">TLS</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t("smtp_tls_description") || "Force TLS (port 465). Leave off to use STARTTLS (port 587)."}
              </p>
            </div>
            <Switch checked={form.tls} onCheckedChange={(v) => set("tls", v)} />
          </div>
        </div>

        <Separator />

        {/* Auth */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t("smtp_auth") || "Authentication"}</h3>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_username")}</Label>
              <Input
                placeholder="user@example.com"
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                className="bg-muted/50 rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_password")}</Label>
              <Input
                type="password"
                placeholder={hasExistingPassword ? "••••••••  (unchanged)" : t("password")}
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                className="bg-muted/50 rounded-xl"
              />
            </div>
          </div>
        </div>

        <Separator />

        {/* Sender */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">{t("smtp_sender") || "Sender"}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_from_email")}</Label>
              <Input
                placeholder="noreply@example.com"
                value={form.senderAddress}
                onChange={(e) => set("senderAddress", e.target.value)}
                className="bg-muted/50 rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label className="text-xs text-muted-foreground">{t("smtp_from_name") || "From name"}</Label>
              <Input
                placeholder="Zublo"
                value={form.senderName}
                onChange={(e) => set("senderName", e.target.value)}
                className="bg-muted/50 rounded-xl"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap pt-2">
          <Button onClick={save} disabled={saving} className="rounded-xl shadow-lg shadow-primary/20">
            {saving ? t("saving") || "Saving…" : t("save")}
          </Button>
          <Button variant="outline" onClick={testEmail} disabled={testing || !form.enabled} className="rounded-xl">
            {testing ? t("sending") || "Sending…" : t("send_test_email")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── OIDC / SSO ───────────────────────────────────────────────────────────────
function OIDCTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      if (!res.ok) return null;
      return res.json() as Promise<AdminSettings | null>;
    },
  });

  const save = useMutation({
    mutationFn: (data: Partial<AdminSettings>) =>
      fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success(t("saved"));
    },
  });

  const oidcFields: { key: keyof AdminSettings; label: string; placeholder?: string }[] = [
    { key: "oidc_provider_name", label: t("provider_name"), placeholder: "e.g. Google, Authentik" },
    { key: "oidc_client_id", label: "Client ID" },
    { key: "oidc_client_secret", label: "Client Secret" },
    { key: "oidc_issuer_url", label: "Issuer / Discovery URL", placeholder: "https://accounts.example.com" },
    { key: "oidc_redirect_url", label: "Redirect URL", placeholder: "https://app.example.com/oidc/callback" },
    { key: "oidc_scopes", label: "Scopes", placeholder: "openid email profile" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-primary" />
          OIDC / SSO
        </h2>
        <p className="text-muted-foreground">Configure OpenID Connect for single sign-on.</p>
      </div>

      <Separator />

      <div className="space-y-6">
        {/* Enable toggle */}
        <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <Label className="font-semibold text-primary">{t("enabled")}</Label>
          <Switch
            checked={!!settings?.oidc_enabled}
            onCheckedChange={(c) => save.mutate({ oidc_enabled: c })}
          />
        </div>

        <Separator />

        <div className="space-y-4">
          {oidcFields.map(({ key, label, placeholder }) => (
            <div key={key as string} className="grid gap-2">
              <Label className="text-sm font-medium">{label}</Label>
              <Input
                defaultValue={String(settings?.[key] ?? "")}
                onBlur={(e) => save.mutate({ [key]: e.target.value } as Partial<AdminSettings>)}
                className="bg-muted/50 rounded-xl"
                placeholder={placeholder}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Security ─────────────────────────────────────────────────────────────────
function SecurityTab() {
  const { t } = useTranslation();
  const qc = useQueryClient();

  const { data: settings } = useQuery({
    queryKey: ["admin-settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings", {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      if (!res.ok) return null;
      return res.json() as Promise<AdminSettings | null>;
    },
  });

  const save = useMutation({
    mutationFn: (data: Partial<AdminSettings>) =>
      fetch("/api/admin/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-settings"] });
      toast.success(t("saved"));
    },
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Shield className="w-8 h-8 text-primary" />
          {t("security")}
        </h2>
        <p className="text-muted-foreground">Security and integration settings.</p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="grid gap-2">
          <Label className="text-sm font-medium">{t("webhook_allowlist")}</Label>
          <Textarea
            defaultValue={settings?.webhook_allowlist_csv ?? ""}
            onBlur={(e) => save.mutate({ webhook_allowlist_csv: e.target.value })}
            rows={6}
            className="bg-muted/50 font-mono text-sm resize-y rounded-xl"
            placeholder="https://hooks.example.com"
          />
          <p className="text-xs text-muted-foreground">{t("one_url_per_line")}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Backup / Restore ─────────────────────────────────────────────────────────
function BackupTab() {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const download = async () => {
    const res = await fetch("/api/db/backup", {
      headers: { Authorization: `Bearer ${pb.authStore.token}` },
    });
    if (!res.ok) {
      toast.error(t("error"));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `zublo-backup-${new Date().toISOString().slice(0, 10)}.db`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const restore = async (file: File) => {
    const fd = new FormData();
    fd.set("file", file);
    try {
      const res = await fetch("/api/db/restore", {
        method: "POST",
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
        body: fd,
      });
      if (res.ok) toast.success(t("restore_success"));
      else toast.error(t("error"));
    } catch {
      toast.error(t("error"));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Database className="w-8 h-8 text-primary" />
          {t("backup")} &amp; Restore
        </h2>
        <p className="text-muted-foreground">{t("backup_description") || "Download or restore a full database snapshot."}</p>
      </div>

      <Separator />

      <div className="space-y-8">
        <div className="space-y-3">
          <h3 className="font-semibold text-lg">Download Backup</h3>
          <p className="text-sm text-muted-foreground">Download a complete snapshot of your database.</p>
          <Button onClick={download} className="rounded-xl shadow-lg shadow-primary/20">
            <Download className="h-4 w-4 mr-2" />
            {t("download_backup")}
          </Button>
        </div>

        <Separator />

        <div className="space-y-3">
          <h3 className="font-semibold text-lg">{t("restore")}</h3>
          <p className="text-sm text-muted-foreground">Restore your database from a previous backup file (.db).</p>
          <input
            ref={fileRef}
            type="file"
            accept=".db"
            hidden
            onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])}
          />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="rounded-xl">
            <Upload className="h-4 w-4 mr-2" />
            {t("restore_from_backup")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Cronjobs ─────────────────────────────────────────────────────────────────
function CronjobsTab() {
  const { t } = useTranslation();
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState<string | null>(null);

  const jobs = [
    { id: "check_subscriptions", label: t("check_subscriptions") },
    { id: "send_notifications", label: t("send_notifications") },
    { id: "update_exchange_rates", label: t("update_exchange_rates") },
    { id: "save_monthly_costs", label: t("save_monthly_costs") },
    { id: "check_updates", label: t("check_updates") },
  ];

  const run = async (job: string) => {
    setRunning(job);
    setOutput("");
    try {
      const res = await fetch(`/api/cron/${job}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      const text = await res.text();
      setOutput(text);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setOutput(`Error: ${msg}`);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <CalendarClock className="w-8 h-8 text-primary" />
          {t("cronjobs")}
        </h2>
        <p className="text-muted-foreground">Manually trigger background tasks.</p>
      </div>

      <Separator />

      <div className="space-y-6">
        <div className="space-y-3">
          {jobs.map((j) => (
            <div
              key={j.id}
              className="flex items-center justify-between rounded-2xl border bg-card hover:bg-muted/30 p-4 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Play className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{j.label}</span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => run(j.id)}
                disabled={running === j.id}
                className="min-w-[100px] rounded-xl"
              >
                {running === j.id ? t("running") : t("run")}
              </Button>
            </div>
          ))}
        </div>

        {output && (
          <div className="animate-in fade-in duration-300 space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">Output Logs</Label>
            <Textarea
              readOnly
              value={output}
              rows={8}
              className="font-mono text-xs bg-muted/50 rounded-xl resize-y"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Maintenance ──────────────────────────────────────────────────────────────
function MaintenanceTab() {
  const { t } = useTranslation();

  const cleanupLogos = async () => {
    const res = await fetch("/api/admin/deleteunusedlogos", {
      method: "POST",
      headers: { Authorization: `Bearer ${pb.authStore.token}` },
    });
    const data = await res.json();
    toast.success(`Deleted ${data.deleted ?? 0} logos`);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Wrench className="w-8 h-8 text-primary" />
          {t("maintenance")}
        </h2>
        <p className="text-muted-foreground">System cleanup and optimization.</p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="rounded-2xl border bg-card p-6 space-y-3">
          <div className="flex items-center gap-3">
            <ServerCrash className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">{t("cleanup_logos")}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{t("cleanup_logos_description")}</p>
          <Button onClick={cleanupLogos} className="rounded-xl shadow-lg shadow-primary/20">
            <Trash2 className="w-4 h-4 mr-2" />
            {t("cleanup_logos")}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function AdminPage() {
  const { t } = useTranslation();
  const { isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState("users");

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">{t("no_permission")}</p>
      </div>
    );
  }

  const MENU_ITEMS = [
    { value: "users", label: t("users"), icon: Users },
    { value: "registration", label: t("registration"), icon: Settings },
    { value: "smtp", label: "SMTP", icon: Mail },
    { value: "oidc", label: "OIDC/SSO", icon: ShieldCheck },
    { value: "security", label: t("security"), icon: Shield },
    { value: "backup", label: t("backup"), icon: Database },
    { value: "cronjobs", label: t("cronjobs"), icon: CalendarClock },
    { value: "maintenance", label: t("maintenance"), icon: Wrench },
  ];

  const renderActiveTab = () => {
    switch (activeTab) {
      case "users": return <UsersTab />;
      case "registration": return <RegistrationTab />;
      case "smtp": return <SMTPTab />;
      case "oidc": return <OIDCTab />;
      case "security": return <SecurityTab />;
      case "backup": return <BackupTab />;
      case "cronjobs": return <CronjobsTab />;
      case "maintenance": return <MaintenanceTab />;
      default: return null;
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 max-w-6xl mx-auto min-h-[calc(100vh-8rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0 space-y-1 md:sticky md:top-0 md:self-start">
        <h2 className="text-2xl font-bold mb-6 px-3 tracking-tight">{t("admin", "Admin")}</h2>
        <nav className="flex flex-col space-y-1">
          {MENU_ITEMS.map((item) => {
            const isActive = activeTab === item.value;
            const Icon = item.icon;
            return (
              <button
                key={item.value}
                onClick={() => setActiveTab(item.value)}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 text-left ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-primary-foreground" : "opacity-70"}`} />
                {item.label}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-card rounded-3xl border shadow-sm p-6 md:p-10 relative overflow-hidden flex flex-col">
        {renderActiveTab()}
      </main>
    </div>
  );
}
