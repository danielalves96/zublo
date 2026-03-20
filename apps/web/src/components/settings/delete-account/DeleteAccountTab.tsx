import { AlertTriangle,Trash2 } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MessageDialog } from "@/components/ui/message-dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { usersService } from "@/services/users";

export function DeleteAccountTab() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [dialog, setDialog] = useState<{ type: "success" | "error"; title: string; description: string } | null>(null);

  const handleDelete = async () => {
    if (confirmText !== user?.email) return;
    setIsDeleting(true);
    try {
      if (user?.id) {
        await usersService.delete(user.id);
        setDialog({ type: "success", title: t("delete_account"), description: t("success_delete_account") });
      }
    } catch {
      setDialog({ type: "error", title: t("delete_account"), description: t("error_deleting_account") });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <MessageDialog
        open={!!dialog}
        onClose={() => {
          if (dialog?.type === "success") logout();
          setDialog(null);
        }}
        type={dialog?.type ?? "success"}
        title={dialog?.title ?? ""}
        description={dialog?.description ?? ""}
      />
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 text-destructive flex items-center gap-3">
          <Trash2 className="w-8 h-8" />
          {t("delete_account")}
        </h2>
        <p className="text-muted-foreground">{t("delete_account_desc")}</p>
      </div>

      <Separator />

      <div className="space-y-6">
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 md:p-8 shadow-sm">
          <div className="flex items-start gap-4 mb-6 text-destructive">
            <div className="p-3 bg-destructive/10 rounded-2xl shrink-0 mt-1">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-xl mb-2">{t("warning_permanent_action")}</h3>
              <p className="text-destructive/80 leading-relaxed text-sm">
                {t("delete_account_detail")}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">{t("confirm_type_email")} <strong className="font-mono text-destructive">{user?.email}</strong></p>
              <Input
                type="email"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={t("confirm_email_placeholder")}
                className="bg-background/50 h-12 rounded-xl border-destructive/30 focus-visible:ring-destructive"
              />
            </div>

            <Button
              variant="destructive"
              size="lg"
              className="w-full rounded-xl h-12 text-base font-semibold shadow-lg shadow-destructive/20"
              disabled={confirmText !== user?.email || isDeleting}
              onClick={handleDelete}
            >
              {isDeleting ? t("deleting") : t("permanently_delete_account")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
