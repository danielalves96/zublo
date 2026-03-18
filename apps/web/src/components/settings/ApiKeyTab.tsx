import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiKeysService } from "@/services/apiKeys";
import { queryKeys } from "@/lib/queryKeys";
import type { ApiKey, ApiKeyCreated, ApiKeyPermission } from "@/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  Shield,
  ChevronDown,
  ChevronRight,
  BookOpen,
} from "lucide-react";
import { toast } from "@/lib/toast";

// ─── Permission definitions ────────────────────────────────────────────────────

interface PermissionDef {
  id: ApiKeyPermission;
  labelKey: string;
  descKey: string;
}

const PERMISSIONS: PermissionDef[] = [
  { id: "subscriptions:read",  labelKey: "perm_subscriptions_read",  descKey: "perm_subscriptions_read_desc" },
  { id: "subscriptions:write", labelKey: "perm_subscriptions_write", descKey: "perm_subscriptions_write_desc" },
  { id: "calendar:read",       labelKey: "perm_calendar_read",       descKey: "perm_calendar_read_desc" },
  { id: "statistics:read",     labelKey: "perm_statistics_read",     descKey: "perm_statistics_read_desc" },
];

const PERM_COLORS: Record<ApiKeyPermission, { badge: string; card: string; border: string }> = {
  "subscriptions:read":  { badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400",   card: "bg-blue-500/5 hover:bg-blue-500/10",   border: "border-blue-500/40" },
  "subscriptions:write": { badge: "bg-orange-500/10 text-orange-600 dark:text-orange-400", card: "bg-orange-500/5 hover:bg-orange-500/10", border: "border-orange-500/40" },
  "calendar:read":       { badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400", card: "bg-purple-500/5 hover:bg-purple-500/10", border: "border-purple-500/40" },
  "statistics:read":     { badge: "bg-green-500/10 text-green-600 dark:text-green-400",  card: "bg-green-500/5 hover:bg-green-500/10",  border: "border-green-500/40" },
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function PermissionBadge({ perm }: { perm: ApiKeyPermission }) {
  const { t } = useTranslation();
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${PERM_COLORS[perm].badge}`}>
      {t(PERMISSIONS.find((p) => p.id === perm)?.labelKey ?? perm)}
    </span>
  );
}

function KeyRowSkeleton() {
  return (
    <div className="flex items-start justify-between gap-4 py-4 px-2 animate-pulse">
      <div className="flex-1 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-muted" />
          <div className="h-4 w-32 rounded-md bg-muted" />
          <div className="h-5 w-20 rounded-md bg-muted" />
        </div>
        <div className="flex gap-1.5 pl-9">
          <div className="h-5 w-24 rounded-full bg-muted" />
          <div className="h-5 w-20 rounded-full bg-muted" />
        </div>
        <div className="flex gap-4 pl-9">
          <div className="h-3.5 w-32 rounded bg-muted" />
          <div className="h-3.5 w-28 rounded bg-muted" />
        </div>
      </div>
      <div className="w-8 h-8 rounded-lg bg-muted shrink-0" />
    </div>
  );
}

function KeyRow({ apiKey, onDelete }: { apiKey: ApiKey; onDelete: (id: string) => void }) {
  const { t } = useTranslation();

  const formattedDate = new Date(apiKey.created).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric",
  });

  const formattedLastUsed = apiKey.last_used_at
    ? new Date(apiKey.last_used_at).toLocaleDateString(undefined, {
        year: "numeric", month: "short", day: "numeric",
      })
    : t("api_key_never_used");

  return (
    <div className="group flex items-start justify-between gap-4 py-4 pl-2  rounded-xl transition-colors duration-150 w-full">
      <div className="min-w-0 flex-1 space-y-2">
        {/* Name + prefix */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Key className="w-3.5 h-3.5 text-primary" />
          </div>
          <span className="font-semibold">{apiKey.name}</span>
          <code className="text-xs text-muted-foreground font-mono bg-muted px-2 py-0.5 rounded-md">
            {apiKey.key_prefix}
          </code>
        </div>

        {/* Permissions */}
        <div className="flex flex-wrap gap-1.5 pl-9">
          {apiKey.permissions.map((p) => (
            <PermissionBadge key={p} perm={p} />
          ))}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground pl-9">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {t("api_key_created_at")}: {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            {t("api_key_last_used")}: {formattedLastUsed}
          </span>
        </div>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer transition-colors duration-150"
        onClick={() => onDelete(apiKey.id)}
        aria-label={t("api_key_delete")}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Create dialog ─────────────────────────────────────────────────────────────

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (name: string, permissions: ApiKeyPermission[]) => void;
  isPending: boolean;
}

function CreateDialog({ open, onClose, onCreate, isPending }: CreateDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<Set<ApiKeyPermission>>(new Set());

  const toggle = (perm: ApiKeyPermission) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) next.delete(perm);
      else next.add(perm);
      return next;
    });
  };

  const handleSubmit = () => {
    if (!name.trim() || selected.size === 0) return;
    onCreate(name.trim(), [...selected]);
  };

  const handleClose = () => {
    setName("");
    setSelected(new Set());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="w-4 h-4 text-primary" />
            </div>
            {t("new_api_key")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="key-name">{t("api_key_name")}</Label>
            <Input
              id="key-name"
              placeholder={t("api_key_name_placeholder")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
          </div>

          {/* Permissions */}
          <div className="space-y-2">
            <Label>{t("api_key_permissions")}</Label>
            <div className="grid grid-cols-1 gap-2">
              {PERMISSIONS.map((perm) => {
                const checked = selected.has(perm.id);
                const colors = PERM_COLORS[perm.id];
                return (
                  <button
                    key={perm.id}
                    type="button"
                    onClick={() => toggle(perm.id)}
                    className={`w-full text-left flex items-start gap-3 rounded-xl border-2 p-3 transition-all duration-150 cursor-pointer ${
                      checked
                        ? `${colors.card} ${colors.border}`
                        : "border-transparent bg-muted/40 hover:bg-muted"
                    }`}
                  >
                    <div className={`w-4.5 h-4.5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 transition-all duration-150 ${
                      checked ? "bg-primary border-primary" : "border-muted-foreground/40"
                    }`}>
                      {checked && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-snug">{t(perm.labelKey)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{t(perm.descKey)}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="rounded-xl cursor-pointer">
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || selected.size === 0 || isPending}
            className="rounded-xl cursor-pointer"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                {t("create_api_key")}
              </span>
            ) : (
              t("create_api_key")
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reveal dialog (shown once after creation) ─────────────────────────────────

interface RevealDialogProps {
  created: ApiKeyCreated | null;
  onClose: () => void;
}

function RevealDialog({ created, onClose }: RevealDialogProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!created) return;
    await navigator.clipboard.writeText(created.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={!!created} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <div className="w-7 h-7 rounded-full bg-green-500/15 flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
            {t("api_key_created_title")}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Warning */}
          <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-950/40 p-4">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800 dark:text-amber-300 leading-relaxed">
              {t("api_key_created_warning")}
            </p>
          </div>

          {/* Key display */}
          <div className="space-y-1.5">
            <Label>{t("api_key")}</Label>
            <div className="flex gap-2">
              <Input
                readOnly
                value={created?.key ?? ""}
                className="font-mono text-sm bg-muted rounded-xl tracking-wide"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                variant={copied ? "default" : "outline"}
                size="icon"
                className="shrink-0 rounded-xl cursor-pointer transition-all duration-200"
                onClick={copy}
                aria-label={t("api_key_copy")}
              >
                {copied
                  ? <Check className="w-4 h-4" />
                  : <Copy className="w-4 h-4" />}
              </Button>
            </div>
            {copied && (
              <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                <Check className="w-3 h-3" />
                {t("api_key_copied")}
              </p>
            )}
          </div>

          {/* Permissions summary */}
          {created && created.permissions.length > 0 && (
            <div className="space-y-1.5">
              <Label>{t("api_key_permissions")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {created.permissions.map((p) => (
                  <PermissionBadge key={p} perm={p} />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} className="rounded-xl w-full cursor-pointer gap-2">
            <Check className="w-4 h-4" />
            {t("api_key_done")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Endpoints reference ───────────────────────────────────────────────────────

const SUBSCRIPTION_CREATE_BODY = `{
  "name": "Netflix",           // required
  "price": 15.99,              // required
  "currency_id": "<id>",       // required — from GET /api/external/subscriptions
  "cycle_id": "<id>",          // required — Monthly/Yearly/Weekly/Daily record id
  "frequency": 1,              // required — e.g. 1 = every 1 cycle
  "next_payment": "2025-02-01",// required — YYYY-MM-DD
  "auto_renew": true,          // optional
  "notify": true,              // optional
  "notify_days_before": 3,     // optional
  "notes": "...",              // optional
  "url": "https://...",        // optional
  "category_id": "<id>",       // optional
  "payment_method_id": "<id>", // optional
  "payer_id": "<id>"           // optional
}`;

function EndpointsReference() {
  const { t } = useTranslation();
  const base = window.location.origin;
  const [open, setOpen] = useState(false);
  const [showBody, setShowBody] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  const copyUrl = async (url: string) => {
    await navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 1500);
  };

  const endpoints = [
    {
      label: t("api_key_endpoint_subscriptions_list"),
      perm: "subscriptions:read" as ApiKeyPermission,
      method: "GET",
      url: `${base}/api/external/subscriptions?key=YOUR_KEY`,
    },
    {
      label: t("api_key_endpoint_subscriptions_create"),
      perm: "subscriptions:write" as ApiKeyPermission,
      method: "POST",
      url: `${base}/api/external/subscriptions?key=YOUR_KEY`,
      hasBody: true,
    },
    {
      label: t("api_key_endpoint_statistics"),
      perm: "statistics:read" as ApiKeyPermission,
      method: "GET",
      url: `${base}/api/external/statistics?key=YOUR_KEY`,
    },
    {
      label: t("api_key_endpoint_calendar"),
      perm: "calendar:read" as ApiKeyPermission,
      method: "GET",
      url: `${base}/api/calendar/ical?key=YOUR_KEY`,
    },
  ];

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* Header — clickable toggle */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-6 py-4 bg-muted/30 hover:bg-muted/50 transition-colors duration-150 cursor-pointer"
      >
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
        </div>
        <h3 className="font-semibold text-sm flex-1 text-left">{t("api_key_endpoints_title")}</h3>
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {/* Endpoint list */}
      {open && <div className="divide-y border-t">
        {endpoints.map((ep) => (
          <div key={ep.url} className="px-6 py-4 space-y-2">
            {/* Label row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md tabular-nums ${
                ep.method === "GET"
                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                  : "bg-green-500/10 text-green-600 dark:text-green-400"
              }`}>
                {ep.method}
              </span>
              <span className="text-sm font-medium">{ep.label}</span>
              <PermissionBadge perm={ep.perm} />
            </div>

            {/* URL row */}
            <div className="flex items-center gap-1.5">
              <code className="flex-1 text-xs text-muted-foreground font-mono bg-muted px-3 py-1.5 rounded-lg break-all leading-relaxed">
                {ep.url}
              </code>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-lg cursor-pointer"
                onClick={() => copyUrl(ep.url)}
                aria-label="Copy URL"
              >
                {copiedUrl === ep.url
                  ? <Check className="w-3.5 h-3.5 text-green-500" />
                  : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
              </Button>
            </div>

            {/* Body schema toggle */}
            {ep.hasBody && (
              <div>
                <button
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 cursor-pointer"
                  onClick={() => setShowBody((v) => !v)}
                >
                  {showBody
                    ? <ChevronDown className="w-3.5 h-3.5" />
                    : <ChevronRight className="w-3.5 h-3.5" />}
                  {t("api_key_show_body_schema")}
                </button>
                {showBody && (
                  <pre className="mt-2 text-xs font-mono bg-muted rounded-xl px-4 py-3 overflow-x-auto text-muted-foreground leading-relaxed">
                    {SUBSCRIPTION_CREATE_BODY}
                  </pre>
                )}
              </div>
            )}
          </div>
        ))}
      </div>}
    </div>
  );
}

// ─── Main tab ─────────────────────────────────────────────────────────────────

export function ApiKeyTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);
  const [justCreated, setJustCreated] = useState<ApiKeyCreated | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: queryKeys.apiKeys(user!.id),
    queryFn: () => apiKeysService.list(),
    enabled: !!user,
  });

  const createMut = useMutation({
    mutationFn: ({ name, permissions }: { name: string; permissions: ApiKeyPermission[] }) =>
      apiKeysService.create(name, permissions),
    onSuccess: (created) => {
      qc.invalidateQueries({ queryKey: queryKeys.apiKeys(user!.id) });
      setShowCreate(false);
      setJustCreated(created);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiKeysService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apiKeys(user!.id) });
      toast.success(t("success"));
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleDelete = (id: string) => {
    const key = keys.find((k) => k.id === id);
    if (!key) return;
    if (!confirm(t("api_key_confirm_delete", { name: key.name }))) return;
    deleteMut.mutate(id);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
          <Key className="w-8 h-8 text-primary" />
          {t("api_keys")}
        </h2>
        <p className="text-muted-foreground">{t("api_key_tab_desc")}</p>
      </div>

      <Separator />

      {/* Key list */}
      <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
        {/* List header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">{t("api_keys")}</span>
            {!isLoading && (
              <Badge variant="secondary" className="text-xs tabular-nums">
                {keys.length}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            className="rounded-xl gap-1.5 cursor-pointer"
            onClick={() => setShowCreate(true)}
          >
            <Plus className="w-4 h-4" />
            {t("new_api_key")}
          </Button>
        </div>

        {/* List body */}
        {isLoading ? (
          <div className="divide-y px-0">
            <KeyRowSkeleton />
            <KeyRowSkeleton />
          </div>
        ) : keys.length === 0 ? (
          <div className="px-6 py-14 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Key className="w-7 h-7 text-muted-foreground/50" />
            </div>
            <div className="space-y-1">
              <p className="font-medium text-sm">{t("api_key_no_keys")}</p>
              <p className="text-muted-foreground text-xs max-w-xs mx-auto">{t("api_key_tab_desc")}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 cursor-pointer"
              onClick={() => setShowCreate(true)}
            >
              <Plus className="w-4 h-4" />
              {t("create_api_key")}
            </Button>
          </div>
        ) : (
          <div className="divide-y px-6">
            {keys.map((k) => (
              <KeyRow key={k.id} apiKey={k} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>

      {/* Endpoints reference */}
      <EndpointsReference />

      {/* Dialogs */}
      <CreateDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={(name, permissions) => createMut.mutate({ name, permissions })}
        isPending={createMut.isPending}
      />
      <RevealDialog
        created={justCreated}
        onClose={() => setJustCreated(null)}
      />
    </div>
  );
}
