import { Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

export function BackupCodesGrid({
  codes,
  title,
}: {
  codes: string[];
  title: string;
}) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);

  return (
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
          {title}
        </p>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setVisible((current) => !current)}
            className="h-8 px-2 text-muted-foreground"
          >
            {visible ? (
              <EyeOff className="h-3.5 w-3.5" />
            ) : (
              <Eye className="h-3.5 w-3.5" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              navigator.clipboard.writeText(codes.join("\n"));
              toast.success(t("copied"));
            }}
            className="h-8 px-2 text-muted-foreground"
          >
            <Copy className="h-3.5 w-3.5 mr-1" />
            {t("copy")}
          </Button>
        </div>
      </div>
      <p className="text-xs text-amber-600/80 dark:text-amber-400/70">
        {t("backup_codes_warning")}
      </p>
      <div className="grid grid-cols-2 gap-2">
        {codes.map((code, index) => (
          <code
            key={index}
            className={`rounded-lg border border-border/40 bg-background/50 px-3 py-2 text-center font-mono text-sm tracking-widest transition-all ${
              visible ? "" : "blur-sm select-none"
            }`}
          >
            {code}
          </code>
        ))}
      </div>
    </div>
  );
}
