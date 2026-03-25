import { AlertTriangle, Check, Copy } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { PermissionBadge } from "@/components/settings/api-keys/PermissionBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiKeyCreated } from "@/types";

interface ApiKeyRevealDialogProps {
  created: ApiKeyCreated | null;
  onClose: () => void;
}

export function ApiKeyRevealDialog({
  created,
  onClose,
}: ApiKeyRevealDialogProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    /* v8 ignore next -- copy button only renders when dialog is open (created !== null) */
    if (!created) return;

    await navigator.clipboard.writeText(created.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={!!created} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-500/15">
              <Check className="h-4 w-4" />
            </div>
            {t("api_key_created_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-950/40">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-300">
              {t("api_key_created_warning")}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>{t("api_key")}</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={created?.key ?? ""}
                className="rounded-xl bg-muted font-mono text-sm tracking-wide"
                onClick={(event) =>
                  (event.target as HTMLInputElement).select()
                }
              />
              <Button
                variant={copied ? "default" : "outline"}
                size="icon"
                className="cursor-pointer shrink-0 rounded-xl transition-all duration-200"
                onClick={handleCopy}
                aria-label={t("api_key_copy")}
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
            {copied ? (
              <p className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Check className="h-3 w-3" />
                {t("api_key_copied")}
              </p>
            ) : null}
          </div>

          {created && created.permissions.length > 0 ? (
            <div className="space-y-1.5">
              <Label>{t("api_key_permissions")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {created.permissions.map((permission) => (
                  <PermissionBadge key={permission} perm={permission} />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            onClick={onClose}
            className="w-full cursor-pointer gap-2 rounded-xl"
          >
            <Check className="h-4 w-4" />
            {t("api_key_done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
