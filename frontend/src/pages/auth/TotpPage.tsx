import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import pb from "@/lib/pb";
import { OtpInput } from "@/components/ui/otp-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "@/lib/toast";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type Screen = "otp" | "backup";

async function verifyLogin(
  email: string,
  password: string,
  code: string,
  remember: boolean,
  refreshUser: () => Promise<void>,
) {
  // Step 1: authenticate to get a session
  const authData = await pb
    .collection("users")
    .authWithPassword(email, password);

  // Step 2: verify code with the fresh session
  const res = await fetch("/api/auth/totp/login-verify", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${pb.authStore.token}`,
    },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    pb.authStore.clear();
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }

  if (remember) {
    localStorage.setItem(
      `totp_trusted_${authData.record.id}`,
      String(Date.now() + THIRTY_DAYS_MS),
    );
  }

  await refreshUser();
}

// ─── OTP screen ───────────────────────────────────────────────────────────────

function OtpScreen({
  state,
  onBackupLink,
}: {
  state: { email: string; password: string };
  onBackupLink: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [otp, setOtp] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) return;
    setLoading(true);
    try {
      await verifyLogin(state.email, state.password, otp, remember, refreshUser);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("invalid_otp"));
      setOtp("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex flex-col items-center gap-3">
        <Label className="text-sm text-muted-foreground">{t("enter_otp")}</Label>
        <OtpInput value={otp} onChange={setOtp} disabled={loading} />
      </div>

      <div className="flex items-center gap-3">
        <Switch id="remember" checked={remember} onCheckedChange={setRemember} />
        <Label htmlFor="remember" className="cursor-pointer font-normal text-sm">
          {t("remember_device_30_days")}
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={loading || otp.length < 6}>
        {loading ? t("loading") : t("verify")}
      </Button>

      <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
        <button type="button" onClick={onBackupLink} className="text-primary hover:underline">
          {t("use_backup_code") || "Use a backup code"}
        </button>
        <button
          type="button"
          className="hover:text-foreground transition-colors"
          onClick={() => navigate("/login", { replace: true })}
        >
          {t("back_to_login")}
        </button>
      </div>
    </form>
  );
}

// ─── Backup code screen ────────────────────────────────────────────────────────

function BackupScreen({
  state,
  onBack,
}: {
  state: { email: string; password: string };
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const stripped = code.replace(/\s/g, "");
    if (stripped.length < 8) return;
    setLoading(true);
    try {
      await verifyLogin(state.email, state.password, stripped, false, refreshUser);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("invalid_otp"));
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="backup">{t("backup_codes") || "Backup code"}</Label>
        <Input
          id="backup"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="XXXX-XXXX"
          maxLength={9}
          required
          autoFocus
          className="text-center font-mono text-lg tracking-widest"
          disabled={loading}
        />
        <p className="text-xs text-muted-foreground">
          {t("backup_codes_warning") || "Each backup code can only be used once."}
        </p>
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading || code.replace(/[\s-]/g, "").length < 8}
      >
        {loading ? t("loading") : t("verify")}
      </Button>

      <div className="text-center text-sm">
        <button type="button" onClick={onBack} className="text-primary hover:underline">
          {t("use_authenticator_app") || "Use authenticator app instead"}
        </button>
      </div>
    </form>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export function TotpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [screen, setScreen] = useState<Screen>("otp");

  const state = location.state as { email?: string; password?: string } | null;

  if (!state?.email || !state?.password) {
    navigate("/login", { replace: true });
    return null;
  }

  const credentials = { email: state.email, password: state.password };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <img
              src="/assets/logos/logo-name-vertical.png"
              alt={t("app_name")}
              className="h-10 w-auto"
            />
          </div>
          <CardTitle>{t("two_factor_auth")}</CardTitle>
          <CardDescription>
            {screen === "otp"
              ? t("enter_otp")
              : (t("enter_backup_code_desc") || "Enter one of your saved backup codes")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {screen === "otp" ? (
            <OtpScreen state={credentials} onBackupLink={() => setScreen("backup")} />
          ) : (
            <BackupScreen state={credentials} onBack={() => setScreen("otp")} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
