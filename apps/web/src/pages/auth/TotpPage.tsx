import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import type { TotpLoginChallenge } from "@/services/auth";
import { authService } from "@/services/auth";
import { LS_KEYS, SS_KEYS } from "@/lib/constants";
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
import { LogoWithName } from "@/components/AppLogo";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

type Screen = "otp" | "backup";

function clearStoredTotpChallenge() {
  sessionStorage.removeItem(SS_KEYS.TOTP_LOGIN_CHALLENGE);
}

function readStoredTotpChallenge(): TotpLoginChallenge | null {
  const raw = sessionStorage.getItem(SS_KEYS.TOTP_LOGIN_CHALLENGE);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<TotpLoginChallenge>;
    if (
      typeof parsed.challenge !== "string"
      || typeof parsed.expiresAt !== "string"
      || typeof parsed.userId !== "string"
    ) {
      clearStoredTotpChallenge();
      return null;
    }

    if (Date.parse(parsed.expiresAt) <= Date.now()) {
      clearStoredTotpChallenge();
      return null;
    }

    return {
      challenge: parsed.challenge,
      expiresAt: parsed.expiresAt,
      userId: parsed.userId,
    };
  } catch {
    clearStoredTotpChallenge();
    return null;
  }
}

async function verifyLogin(
  challenge: TotpLoginChallenge,
  code: string,
  remember: boolean,
  refreshUser: () => Promise<void>,
) {
  const authData = await authService.completeTotpLoginChallenge(challenge.challenge, code);
  authService.saveSession(authData.token, authData.record);

  if (remember) {
    localStorage.setItem(
      LS_KEYS.totpTrusted(authData.record.id),
      String(Date.now() + THIRTY_DAYS_MS),
    );
  }

  clearStoredTotpChallenge();
  await refreshUser();
}

// ─── OTP screen ───────────────────────────────────────────────────────────────

function OtpScreen({
  challenge,
  onChallengeExpired,
  onBackupLink,
}: {
  challenge: TotpLoginChallenge;
  onChallengeExpired: () => void;
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
      await verifyLogin(challenge, otp, remember, refreshUser);
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("invalid_otp");
      if (/challenge/i.test(message)) {
        clearStoredTotpChallenge();
        toast.error(message);
        onChallengeExpired();
        return;
      }
      toast.error(message);
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
          {t("use_backup_code")}
        </button>
        <button
          type="button"
          className="hover:text-foreground transition-colors"
          onClick={() => {
            clearStoredTotpChallenge();
            navigate({ to: "/login", replace: true });
          }}
        >
          {t("back_to_login")}
        </button>
      </div>
    </form>
  );
}

// ─── Backup code screen ────────────────────────────────────────────────────────

function BackupScreen({
  challenge,
  onChallengeExpired,
  onBack,
}: {
  challenge: TotpLoginChallenge;
  onChallengeExpired: () => void;
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
      await verifyLogin(challenge, stripped, false, refreshUser);
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : t("invalid_otp");
      if (/challenge/i.test(message)) {
        clearStoredTotpChallenge();
        toast.error(message);
        onChallengeExpired();
        return;
      }
      toast.error(message);
      setCode("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="backup">{t("backup_codes")}</Label>
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
          {t("backup_codes_warning")}
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
          {t("use_authenticator_app")}
        </button>
      </div>
    </form>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export function TotpPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [screen, setScreen] = useState<Screen>("otp");
  const [challenge, setChallenge] = useState<TotpLoginChallenge | null>(null);

  useEffect(() => {
    const storedChallenge = readStoredTotpChallenge();
    if (!storedChallenge) {
      navigate({ to: "/login", replace: true });
      return;
    }
    setChallenge(storedChallenge);
  }, [navigate]);

  if (!challenge) {
    return null;
  }

  const handleChallengeExpired = () => {
    navigate({ to: "/login", replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <LogoWithName className="h-10 w-auto" />
          </div>
          <CardTitle>{t("two_factor_auth")}</CardTitle>
          <CardDescription>
            {screen === "otp"
              ? t("enter_otp")
              : t("enter_backup_code_desc")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {screen === "otp" ? (
            <OtpScreen
              challenge={challenge}
              onChallengeExpired={handleChallengeExpired}
              onBackupLink={() => setScreen("backup")}
            />
          ) : (
            <BackupScreen
              challenge={challenge}
              onChallengeExpired={handleChallengeExpired}
              onBack={() => setScreen("otp")}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
