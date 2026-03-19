import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { adminService } from "@/services/admin";
import { Crown, Pencil, Trash2 } from "lucide-react";
import type { AdminUser } from "@/components/admin/users/types";

interface UserListItemProps {
  currentUserId?: string;
  onDelete: () => void;
  onEdit: () => void;
  user: AdminUser;
}

export function UserListItem({
  currentUserId,
  onDelete,
  onEdit,
  user,
}: UserListItemProps) {
  const { t } = useTranslation();
  const isSelf = user.id === currentUserId;
  const display = user.name || user.username || user.email;
  const initials = display[0]?.toUpperCase() || "U";
  const avatar = adminService.avatarUrl(user.id, user.avatar);

  return (
    <li className="flex items-center gap-4 rounded-2xl border bg-card hover:bg-muted/30 p-3 transition-colors group">
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
          {user.is_admin && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center gap-1 shrink-0">
              <Crown className="w-2.5 h-2.5" /> {t("admin")}
            </span>
          )}
          {isSelf && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary shrink-0">
              {t("you_label")}
            </span>
          )}
          {user.totp_enabled && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 shrink-0">
              2FA
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
        {user.username && user.username !== display && (
          <p className="text-xs text-muted-foreground truncate">@{user.username}</p>
        )}
      </div>

      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-foreground hover:bg-muted"
          onClick={onEdit}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 disabled:opacity-30"
          onClick={onDelete}
          disabled={isSelf}
          title={isSelf ? t("cannot_delete_yourself") : t("delete")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </li>
  );
}
