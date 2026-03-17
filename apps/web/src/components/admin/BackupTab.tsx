import { useRef } from "react";
import { useTranslation } from "react-i18next";
import pb from "@/lib/pb";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Database, Download, Upload } from "lucide-react";

export function BackupTab() {
  const { t } = useTranslation();
  const fileRef = useRef<HTMLInputElement>(null);

  const download = async () => {
    const res = await fetch("/api/db/backup", {
      headers: { Authorization: `Bearer ${pb.authStore.token}` },
    });
    if (!res.ok) { toast.error(t("error")); return; }
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
    } catch { toast.error(t("error")); }
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
          <input ref={fileRef} type="file" accept=".db" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} className="rounded-xl">
            <Upload className="h-4 w-4 mr-2" />
            {t("restore_from_backup")}
          </Button>
        </div>
      </div>
    </div>
  );
}
