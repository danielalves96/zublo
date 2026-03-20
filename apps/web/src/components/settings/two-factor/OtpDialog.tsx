import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { OtpInput } from "@/components/ui/otp-input";
import { toast } from "@/lib/toast";

interface OtpDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  confirmLabel: string;
  confirmVariant?: "default" | "destructive";
  onConfirm: (code: string) => Promise<void>;
  allowBackup?: boolean;
}

export function OtpDialog({
  open,
  onClose,
  title,
  description,
  confirmLabel,
  confirmVariant = "default",
  onConfirm,
  allowBackup = false,
}: OtpDialogProps) {
  const { t } = useTranslation();
  const [otp, setOtp] = useState("");
  const [backupMode, setBackupMode] = useState(false);
  const [backupCode, setBackupCode] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setOtp("");
    setBackupCode("");
    setBackupMode(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleConfirm = async () => {
    const code = backupMode ? backupCode.replace(/\s/g, "") : otp;
    setLoading(true);

    try {
      await onConfirm(code);
      reset();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = backupMode
    ? backupCode.replace(/[\s-]/g, "").length >= 8
    : otp.length === 6;

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        if (!isOpen) handleClose();
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {!backupMode ? (
            <div className="flex justify-center">
              <OtpInput value={otp} onChange={setOtp} disabled={loading} />
            </div>
          ) : (
            <Input
              value={backupCode}
              onChange={(e) => setBackupCode(e.target.value)}
              placeholder="XXXX-XXXX"
              maxLength={9}
              autoFocus
              className="font-mono text-center text-lg tracking-widest"
              disabled={loading}
            />
          )}

          {allowBackup && (
            <div className="text-center">
              <button
                type="button"
                className="text-sm text-primary hover:underline"
                onClick={() => {
                  setBackupMode((current) => !current);
                  setOtp("");
                  setBackupCode("");
                }}
              >
                {backupMode
                  ? t("use_authenticator_app")
                  : t("use_backup_code")}
              </button>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {t("cancel")}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={handleConfirm}
            disabled={loading || !canSubmit}
          >
            {loading ? t("loading") : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
