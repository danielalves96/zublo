import { CalendarClock, Play } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { adminService } from "@/services/admin";

export function CronjobsTab() {
  const { t } = useTranslation();
  const [output, setOutput] = useState("");
  const [running, setRunning] = useState<string | null>(null);

  const jobs = [
    { id: "check_subscriptions", label: t("check_subscriptions") },
    { id: "send_notifications", label: t("send_notifications") },
    { id: "update_exchange_rates", label: t("update_exchange_rates") },
    { id: "save_monthly_costs", label: t("save_monthly_costs") },
    { id: "check_updates", label: t("check_updates") },
  ];

  const run = async (job: string) => {
    setRunning(job);
    setOutput("");
    try {
      await adminService.runCron(job);
      setOutput("Done.");
    } catch (e: unknown) {
      setOutput(`Error: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setRunning(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <CalendarClock className="w-8 h-8 text-primary" />
          {t("cronjobs")}
        </h2>
        <p className="text-muted-foreground">{t("cronjobs_desc")}</p>
      </div>

      <Separator />

      <div className="space-y-6">
        <div className="space-y-3">
          {jobs.map((j) => (
            <div key={j.id} className="flex items-center justify-between rounded-2xl border bg-card hover:bg-muted/30 p-4 transition-colors">
              <div className="flex items-center gap-3">
                <Play className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">{j.label}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => run(j.id)} disabled={running === j.id} className="min-w-[100px] rounded-xl">
                {running === j.id ? t("running") : t("run")}
              </Button>
            </div>
          ))}
        </div>

        {output && (
          <div className="animate-in fade-in duration-300 space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground">{t("output_logs")}</Label>
            <Textarea readOnly value={output} rows={8} className="font-mono text-xs bg-muted/50 rounded-xl resize-y" />
          </div>
        )}
      </div>
    </div>
  );
}
