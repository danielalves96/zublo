import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { adminService } from "@/services/admin";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, Pencil, Users, Crown } from "lucide-react";
import type { AdminUser } from "./types";
import { EditUserModal } from "./EditUserModal";
import { AddUserModal } from "./AddUserModal";

export function UsersTab() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();

  const [addingUser, setAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: queryKeys.admin.users(),
    queryFn: () => adminService.getUsers(),
  });

  const deleteUser = useMutation({
    mutationFn: (id: string) => adminService.deleteUser(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.admin.users() });
      toast.success(t("success_delete"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <>
      {addingUser && <AddUserModal onClose={() => setAddingUser(false)} />}
      {editingUser && <EditUserModal user={editingUser} onClose={() => setEditingUser(null)} />}

      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            {t("users")}
          </h2>
          <p className="text-muted-foreground">{t("manage_users")}</p>
        </div>

        <Separator />

        <div className="space-y-4">
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
                  const avatar = adminService.avatarUrl(u.id, u.avatar);

                  return (
                    <li
                      key={u.id}
                      className="flex items-center gap-4 rounded-2xl border bg-card hover:bg-muted/30 p-3 transition-colors group"
                    >
                      <div className="h-11 w-11 shrink-0 rounded-full overflow-hidden ring-2 ring-background shadow-sm">
                        {avatar ? (
                          <img src={avatar} alt={display} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full bg-primary/10 flex items-center justify-center text-base font-bold text-primary">
                            {initials}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">{display}</p>
                          {u.is_admin && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1 shrink-0">
                              <Crown className="w-2.5 h-2.5" /> {t("admin")}
                            </span>
                          )}
                          {isSelf && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
                              {t("you_label")}
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
                          title={isSelf ? t("cannot_delete_yourself") : t("delete")}
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
