import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import pb from "@/lib/pb";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Trash2, AlertTriangle } from "lucide-react";

export function DeleteAccountTab() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (confirmText !== user?.email) return;
    setIsDeleting(true);
    try {
      if (user?.id) {
        await pb.collection("users").delete(user.id);
        alert(t("success_delete_account"));
        logout();
      }
    } catch {
      alert("Error deleting account. Please contact support.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 text-destructive flex items-center gap-3">
          <Trash2 className="w-8 h-8" />
          {t("delete_account")}
        </h2>
        <p className="text-muted-foreground">Permanently remove your account and all associated data.</p>
      </div>

      <Separator />

      <div className="space-y-6">
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 md:p-8 shadow-sm">
          <div className="flex items-start gap-4 mb-6 text-destructive">
            <div className="p-3 bg-destructive/10 rounded-2xl shrink-0 mt-1">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-xl mb-2">Warning: Permanent Action</h3>
              <p className="text-destructive/80 leading-relaxed text-sm">
                If you delete your account, <strong>ALL</strong> your data, including subscriptions, statistics, and settings will be permanently destroyed. 
                This action cannot be undone. We won't be able to recover your data once the operation is complete.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">To confirm deletion, type your email <strong className="font-mono text-destructive">{user?.email}</strong> below:</p>
              <Input
                type="email"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="Confirm your email..."
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
              {isDeleting ? "Deleting..." : "Permanently Delete My Account"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
