import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Users } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { UserListItem } from "@/components/admin/users/UserListItem";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { adminService } from "@/services/admin";

import { AddUserModal } from "./AddUserModal";
import { EditUserModal } from "./EditUserModal";
import type { AdminUser } from "./types";

export function UsersTab() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const qc = useQueryClient();

  const [addingUser, setAddingUser] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

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
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
        />
      )}

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
              <span className="text-sm text-muted-foreground">
                {users.length} {t("users").toLowerCase()}
              </span>
              <Button
                className="rounded-xl gap-2"
                onClick={() => setAddingUser(true)}
              >
                <Plus className="w-4 h-4" />
                {t("add_user")}
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="h-16 rounded-2xl bg-muted/50 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <ul className="space-y-2">
                {users.map((u) => (
                  <UserListItem
                    key={u.id}
                    currentUserId={currentUser?.id}
                    user={u}
                    onEdit={() => setEditingUser(u)}
                    onDelete={() => setPendingDeleteId(u.id)}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingDeleteId}
        onOpenChange={() => setPendingDeleteId(null)}
        title={t("delete")}
        description={t("confirm_delete")}
        onConfirm={() => {
          deleteUser.mutate(pendingDeleteId!);
          setPendingDeleteId(null);
        }}
      />
    </>
  );
}
