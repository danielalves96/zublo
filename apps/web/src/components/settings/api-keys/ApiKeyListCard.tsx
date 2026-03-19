import { useTranslation } from "react-i18next";
import { Clock, Key, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import type { ApiKey } from "@/types";
import { PermissionBadge } from "@/components/settings/api-keys/PermissionBadge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function KeyRowSkeleton() {
  return (
    <div className="flex items-start justify-between gap-4 px-2 py-4 animate-pulse">
      <div className="flex-1 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-muted" />
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
      <div className="h-8 w-8 shrink-0 rounded-lg bg-muted" />
    </div>
  );
}

interface KeyRowProps {
  apiKey: ApiKey;
  onEdit: (key: ApiKey) => void;
  onDelete: (id: string) => void;
}

function KeyRow({ apiKey, onEdit, onDelete }: KeyRowProps) {
  const { t } = useTranslation();

  const formattedDate = new Date(apiKey.created).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formattedLastUsed = apiKey.last_used_at
    ? new Date(apiKey.last_used_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : t("api_key_never_used");

  return (
    <div className="group flex w-full items-start justify-between gap-4 py-4 pl-2 transition-colors duration-150">
      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Key className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="font-semibold">{apiKey.name}</span>
          <code className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
            {apiKey.key_prefix}
          </code>
        </div>

        <div className="flex flex-wrap gap-1.5 pl-9">
          {apiKey.permissions.map((permission) => (
            <PermissionBadge key={permission} perm={permission} />
          ))}
        </div>

        <div className="flex items-center gap-4 pl-9 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {t("api_key_created_at")}: {formattedDate}
          </span>
          <span className="flex items-center gap-1">
            <Shield className="h-3 w-3" />
            {t("api_key_last_used")}: {formattedLastUsed}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer text-muted-foreground transition-colors duration-150 hover:bg-primary/10 hover:text-primary"
          onClick={() => onEdit(apiKey)}
          aria-label={t("edit")}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer text-muted-foreground transition-colors duration-150 hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(apiKey.id)}
          aria-label={t("api_key_delete")}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface ApiKeyListCardProps {
  keys: ApiKey[];
  isLoading: boolean;
  onCreate: () => void;
  onEdit: (key: ApiKey) => void;
  onDelete: (id: string) => void;
}

export function ApiKeyListCard({
  keys,
  isLoading,
  onCreate,
  onEdit,
  onDelete,
}: ApiKeyListCardProps) {
  const { t } = useTranslation();

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="flex items-center justify-between border-b bg-muted/30 px-6 py-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">{t("api_keys")}</span>
          {!isLoading ? (
            <Badge variant="secondary" className="text-xs tabular-nums">
              {keys.length}
            </Badge>
          ) : null}
        </div>
        <Button
          size="sm"
          className="cursor-pointer gap-1.5 rounded-xl"
          onClick={onCreate}
        >
          <Plus className="h-4 w-4" />
          {t("new_api_key")}
        </Button>
      </div>

      {isLoading ? (
        <div className="divide-y px-0">
          <KeyRowSkeleton />
          <KeyRowSkeleton />
        </div>
      ) : keys.length === 0 ? (
        <div className="space-y-4 px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
            <Key className="h-7 w-7 text-muted-foreground/50" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium">{t("api_key_no_keys")}</p>
            <p className="mx-auto max-w-xs text-xs text-muted-foreground">
              {t("api_key_tab_desc")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer gap-1.5 rounded-xl"
            onClick={onCreate}
          >
            <Plus className="h-4 w-4" />
            {t("create_api_key")}
          </Button>
        </div>
      ) : (
        <div className="divide-y px-4">
          {keys.map((key) => (
            <KeyRow
              key={key.id}
              apiKey={key}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
