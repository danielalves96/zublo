import {
  Copy,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { BackupCodesGrid } from "@/components/settings/two-factor/BackupCodesGrid";
import { clearTrustedDevice } from "@/components/settings/two-factor/helpers";
import { OtpDialog } from "@/components/settings/two-factor/OtpDialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/ui/otp-input";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/lib/toast";
import { totpService } from "@/services/totp";

interface SetupData { secret: string; otpauthUri: string; backupCodes: string[]; }

type Dialog2FA = "disable" | "reenable" | "delete" | null;

export function TwoFactorTab() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();

  const isEnabled    = user?.totp_enabled ?? false;
  const isConfigured = user?.totp_configured ?? false;

  // Setup flow state
  const [setupData, setSetupData]   = useState<SetupData | null>(null);
  const [setupCode, setSetupCode]   = useState("");
  const [setupLoading, setSetupLoading] = useState(false);

  // Regen state
  const [showRegen, setShowRegen]   = useState(false);
  const [regenCode, setRegenCode]   = useState("");
  const [regenLoading, setRegenLoading] = useState(false);
  const [newBackup, setNewBackup]   = useState<string[] | null>(null);

  // Active dialog
  const [dialog, setDialog] = useState<Dialog2FA>(null);

  // ── Setup ──────────────────────────────────────────────────────────────────
  const startSetup = async () => {
    setSetupLoading(true);
    try {
      const data = await totpService.setup();
      setSetupData(data);
      setSetupCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setSetupLoading(false);
    }
  };

  const verifyAndEnable = async () => {
    /* v8 ignore next */
    if (!setupData) return;
    setSetupLoading(true);
    try {
      await totpService.verify({ code: setupCode, secret: setupData.secret, backupCodes: setupData.backupCodes });
      await refreshUser();
      toast.success(t("2fa_enabled"));
      setSetupData(null);
      setSetupCode("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setSetupLoading(false);
    }
  };

  // ── Regen ──────────────────────────────────────────────────────────────────
  const regenBackup = async () => {
    setRegenLoading(true);
    try {
      const data = await totpService.regenerateBackup(regenCode);
      setNewBackup(data.backup_codes);
      setRegenCode("");
      setShowRegen(false);
      toast.success(t("backup_codes_regenerated"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("error"));
    } finally {
      setRegenLoading(false);
    }
  };

  // ── Dialog actions ─────────────────────────────────────────────────────────
  const handleDisable = async (code: string) => {
    await totpService.disable(code);
    if (user?.id) clearTrustedDevice(user.id);
    await refreshUser();
    toast.success(t("2fa_disabled"));
    setDialog(null);
  };

  const handleReenable = async (code: string) => {
    await totpService.reenable(code);
    await refreshUser();
    toast.success(t("2fa_enabled"));
    setDialog(null);
  };

  const handleDelete = async (code: string) => {
    await totpService.delete(code);
    if (user?.id) clearTrustedDevice(user.id);
    await refreshUser();
    toast.success(t("2fa_deleted"));
    setDialog(null);
    setNewBackup(null);
  };

  // ── Determine UI state ─────────────────────────────────────────────────────
  const state: "not_configured" | "disabled" | "enabled" =
    isEnabled ? "enabled" : isConfigured ? "disabled" : "not_configured";

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2">{t("two_factor_auth")}</h2>
        <p className="text-muted-foreground">{t("2fa_description")}</p>
      </div>

      <Separator />

      <div className="space-y-6">

        {/* ── Status banner ── */}
        <div className={`rounded-2xl border p-5 flex items-center gap-4 ${isEnabled ? "bg-green-500/10 border-green-500/30" : "bg-muted/50 border-border/40"}`}>
          {isEnabled
            ? <ShieldCheck className="w-10 h-10 text-green-500 shrink-0" />
            : <ShieldOff className="w-10 h-10 text-muted-foreground shrink-0" />}
          <div>
            <h3 className={`font-semibold ${isEnabled ? "text-green-600 dark:text-green-400" : ""}`}>
              {isEnabled ? t("2fa_enabled") : t("2fa_disabled")}
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEnabled
                ? t("2fa_account_protected")
                : state === "disabled"
                ? t("2fa_disabled_linked")
                : t("2fa_enable_hint")}
            </p>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* STATE: not configured                                               */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {state === "not_configured" && !setupData && (
          <Button onClick={startSetup} disabled={setupLoading} size="lg" className="w-full rounded-xl shadow-lg shadow-primary/20">
            <Shield className="w-4 h-4 mr-2" />
            {setupLoading ? t("loading") : t("enable_2fa")}
          </Button>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* Setup flow (inline)                                                 */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {setupData && (
          <div className="space-y-6 rounded-2xl border bg-muted/30 p-6">
            <div>
              <h3 className="font-semibold mb-1">{t("scan_qr_code")}</h3>
              <p className="text-sm text-muted-foreground mb-4">{t("scan_qr_hint")}</p>
              <div className="flex justify-center p-5 bg-white rounded-xl shadow-sm">
                <QRCodeSVG value={setupData.otpauthUri} size={192} />
              </div>
            </div>

            <div className="rounded-xl bg-muted p-3">
              <p className="text-xs text-muted-foreground mb-1">{t("manual_entry_key")}</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono select-all break-all">{setupData.secret}</code>
                <Button variant="ghost" size="icon" className="shrink-0 h-7 w-7" onClick={() => { navigator.clipboard.writeText(setupData!.secret); toast.success(t("copied")); }}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            <BackupCodesGrid codes={setupData.backupCodes} title={t("backup_codes_title")} />

            <div className="space-y-3">
              <Label className="text-sm font-semibold">{t("enter_code")}</Label>
              <div className="flex justify-center">
                <OtpInput value={setupCode} onChange={setSetupCode} disabled={setupLoading} />
              </div>
              <div className="flex gap-2 pt-1">
                <Button onClick={verifyAndEnable} disabled={setupLoading || setupCode.length < 6} className="flex-1 rounded-xl">
                  {setupLoading ? t("loading") : t("verify")}
                </Button>
                <Button variant="outline" onClick={() => { setSetupData(null); setSetupCode(""); }} className="rounded-xl">
                  {t("cancel")}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* STATE: disabled (configured but off)                                */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {state === "disabled" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-medium">{t("enable_2fa")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("2fa_reenable_hint")}</p>
              </div>
              <Switch checked={false} onCheckedChange={() => setDialog("reenable")} />
            </div>

            <Button variant="outline" className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDialog("delete")}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t("delete_2fa_setup")}
            </Button>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════════════ */}
        {/* STATE: enabled                                                       */}
        {/* ════════════════════════════════════════════════════════════════════ */}
        {state === "enabled" && (
          <div className="space-y-4">
            {/* New backup codes shown after regen */}
            {newBackup && (
              <BackupCodesGrid codes={newBackup} title={t("new_backup_codes")} />
            )}

            {/* Enable/disable switch */}
            <div className="flex items-center justify-between rounded-xl border bg-muted/30 p-4">
              <div>
                <p className="text-sm font-medium">{t("two_factor_auth")}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t("2fa_login_require_hint")}</p>
              </div>
              <Switch checked={true} onCheckedChange={() => setDialog("disable")} />
            </div>

            {/* Regen backup codes */}
            {!showRegen && !newBackup && (
              <Button variant="outline" className="w-full rounded-xl" onClick={() => { setShowRegen(true); setRegenCode(""); }}>
                <RefreshCw className="w-4 h-4 mr-2" />
                {t("regenerate_backup_codes")}
              </Button>
            )}

            {showRegen && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5 space-y-4">
                <h3 className="font-semibold text-sm">{t("regenerate_backup_codes")}</h3>
                <p className="text-xs text-muted-foreground">{t("enter_code_to_regen")}</p>
                <div className="flex justify-center">
                  <OtpInput value={regenCode} onChange={setRegenCode} disabled={regenLoading} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={regenBackup} disabled={regenLoading || regenCode.length < 6} className="flex-1 rounded-xl" size="sm">
                    {regenLoading ? t("loading") : t("regenerate")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => { setShowRegen(false); setRegenCode(""); }} className="rounded-xl">
                    {t("cancel")}
                  </Button>
                </div>
              </div>
            )}

            {/* Delete */}
            <Button variant="outline" className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" onClick={() => setDialog("delete")}>
              <Trash2 className="w-4 h-4 mr-2" />
              {t("delete_2fa_setup")}
            </Button>
          </div>
        )}
      </div>

      {/* ── Dialogs ── */}

      <OtpDialog
        open={dialog === "disable"}
        onClose={() => setDialog(null)}
        title={t("confirm_disable_2fa")}
        description="Enter your authenticator code to confirm. Your setup will be saved — you can re-enable later without re-scanning."
        confirmLabel={t("disable_2fa")}
        onConfirm={handleDisable}
      />

      <OtpDialog
        open={dialog === "reenable"}
        onClose={() => setDialog(null)}
        title={t("enable_2fa")}
        description="Enter your 6-digit authenticator code to confirm your app still works."
        confirmLabel={t("enable_2fa")}
        onConfirm={handleReenable}
      />

      <OtpDialog
        open={dialog === "delete"}
        onClose={() => setDialog(null)}
        title={t("delete_2fa_setup")}
        description="This will permanently remove your authenticator link and all backup codes. You will need to re-scan a QR code to set up 2FA again."
        confirmLabel={t("delete_2fa_setup")}
        confirmVariant="destructive"
        onConfirm={handleDelete}
        allowBackup
      />
    </div>
  );
}
