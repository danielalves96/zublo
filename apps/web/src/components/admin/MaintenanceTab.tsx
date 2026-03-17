import { useTranslation } from "react-i18next";
import pb from "@/lib/pb";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Wrench, ServerCrash, Trash2 } from "lucide-react";

export function MaintenanceTab() {
  const { t } = useTranslation();

  const cleanupLogos = async () => {
    const res = await fetch("/api/admin/deleteunusedlogos", {
      method: "POST",
      headers: { Authorization: `Bearer ${pb.authStore.token}` },
    });
    const data = await res.json();
    toast.success(t("logos_deleted", { count: data.deleted ?? 0 }));
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Wrench className="w-8 h-8 text-primary" />
          {t("maintenance")}
        </h2>
        <p className="text-muted-foreground">{t("maintenance_desc")}</p>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="rounded-2xl border bg-card p-6 space-y-3">
          <div className="flex items-center gap-3">
            <ServerCrash className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">{t("cleanup_logos")}</h3>
          </div>
          <p className="text-sm text-muted-foreground">{t("cleanup_logos_description")}</p>
          <Button onClick={cleanupLogos} className="rounded-xl shadow-lg shadow-primary/20">
            <Trash2 className="w-4 h-4 mr-2" />
            {t("cleanup_logos")}
          </Button>
        </div>
      </div>
    </div>
  );
}
