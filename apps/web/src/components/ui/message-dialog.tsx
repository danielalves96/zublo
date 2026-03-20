import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MessageDialogProps {
  open: boolean;
  onClose: () => void;
  type: "success" | "error";
  title: string;
  description: string;
}

export function MessageDialog({
  open,
  onClose,
  type,
  title,
  description,
}: MessageDialogProps) {
  const { t } = useTranslation();

  const isSuccess = type === "success";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm rounded-3xl border-border/50 shadow-2xl">
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 text-xl font-bold ${isSuccess ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isSuccess ? "bg-green-500/15" : "bg-destructive/10"}`}>
              {isSuccess
                ? <CheckCircle2 className="w-5 h-5" />
                : <XCircle className="w-5 h-5" />}
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>

        <DialogFooter>
          <Button
            onClick={onClose}
            className="w-full rounded-xl cursor-pointer"
            variant={isSuccess ? "default" : "destructive"}
          >
            {t("ok")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
