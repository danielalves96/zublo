import { Check, Key, Pencil, Shield } from "lucide-react";
import { type ReactNode,useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  API_KEY_PERMISSION_GROUPS,
  API_KEY_PERMISSIONS,
} from "@/components/settings/api-keys/config";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiKeyPermission } from "@/types";

const EMPTY_PERMISSIONS: ApiKeyPermission[] = [];

interface ApiKeyFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, permissions: ApiKeyPermission[]) => void;
  isPending: boolean;
  title: string;
  submitLabel: string;
  nameInputId: string;
  initialName?: string;
  initialPermissions?: ApiKeyPermission[];
  helperText?: string;
  icon?: ReactNode;
}

function getOrderedPermissions(selected: Set<ApiKeyPermission>) {
  return API_KEY_PERMISSIONS.filter(({ id }) => selected.has(id)).map(
    ({ id }) => id,
  );
}

export function ApiKeyFormDialog({
  open,
  onClose,
  onSubmit,
  isPending,
  title,
  submitLabel,
  nameInputId,
  initialName = "",
  initialPermissions = EMPTY_PERMISSIONS,
  helperText,
  icon,
}: ApiKeyFormDialogProps) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [selected, setSelected] = useState<Set<ApiKeyPermission>>(
    new Set(initialPermissions),
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(initialName);
    setSelected(new Set(initialPermissions));
  }, [initialName, initialPermissions, open]);

  const togglePermission = (permission: ApiKeyPermission) => {
    setSelected((current) => {
      const next = new Set(current);

      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }

      return next;
    });
  };

  const handleWriteToggle = (
    writePermission: ApiKeyPermission,
    readPermission?: ApiKeyPermission,
  ) => {
    if (selected.has(writePermission)) {
      togglePermission(writePermission);
      return;
    }

    setSelected((current) => {
      const next = new Set(current);
      next.add(writePermission);

      if (readPermission) {
        next.add(readPermission);
      }

      return next;
    });
  };

  const handleSubmit = () => {
    if (!name.trim() || selected.size === 0) {
      return;
    }

    onSubmit(name.trim(), getOrderedPermissions(selected));
  };

  const handleClose = () => {
    setName(initialName);
    setSelected(new Set(initialPermissions));
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && handleClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              {icon ?? <Key className="h-4 w-4 text-primary" />}
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="space-y-2">
            <Label htmlFor={nameInputId}>{t("api_key_name")}</Label>
            <Input
              id={nameInputId}
              value={name}
              placeholder={t("api_key_name_placeholder")}
              className="h-10 rounded-xl"
              autoFocus
              autoComplete="off"
              onChange={(event) => setName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleSubmit();
                }
              }}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("api_key_permissions")}</Label>
              <div className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {selected.size} / {API_KEY_PERMISSIONS.length}
              </div>
            </div>

            <div className="max-h-[45vh] overflow-y-auto overflow-hidden rounded-xl border border-border/50 bg-background divide-y divide-border/50">
              {API_KEY_PERMISSION_GROUPS.map((group) => {
                const readPermission = `${group.id}:read` as ApiKeyPermission;
                const writePermission = `${group.id}:write` as ApiKeyPermission;
                const hasRead = API_KEY_PERMISSIONS.some(
                  ({ id }) => id === readPermission,
                );
                const hasWrite = API_KEY_PERMISSIONS.some(
                  ({ id }) => id === writePermission,
                );

                return (
                  <div
                    key={group.id}
                    className="flex items-center justify-between p-3 py-2.5 transition-colors hover:bg-muted/30"
                  >
                    <span className="text-sm font-medium capitalize">
                      {t(group.labelKey)}
                    </span>

                    <div className="flex items-center gap-2">
                      {hasRead && (
                        <button
                          type="button"
                          onClick={() => togglePermission(readPermission)}
                          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-all ${
                            selected.has(readPermission)
                              ? "border border-primary/20 bg-primary/10 text-primary"
                              : "border border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {selected.has(readPermission) && (
                            <Check className="h-3 w-3 stroke-[3]" />
                          )}
                          Read
                        </button>
                      )}

                      {hasWrite && (
                        <button
                          type="button"
                          onClick={() =>
                            handleWriteToggle(
                              writePermission,
                              hasRead ? readPermission : undefined,
                            )
                          }
                          className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-all ${
                            selected.has(writePermission)
                              ? "bg-primary text-primary-foreground shadow-sm"
                              : "border border-transparent bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                          }`}
                        >
                          {selected.has(writePermission) && (
                            <Check className="h-3 w-3 stroke-[3]" />
                          )}
                          Write
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {helperText ? (
              <p className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/40 p-2.5 text-xs text-muted-foreground">
                <Shield className="h-4 w-4 shrink-0 text-primary" />
                {helperText}
              </p>
            ) : null}
          </div>
        </div>

        <DialogFooter className="pt-2">
          <Button variant="ghost" onClick={handleClose} className="rounded-xl">
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!name.trim() || selected.size === 0 || isPending}
            className="rounded-xl px-6 shadow-sm"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
                {submitLabel}
              </span>
            ) : (
              submitLabel
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function CreateApiKeyDialog(
  props: Omit<
    ApiKeyFormDialogProps,
    | "title"
    | "submitLabel"
    | "nameInputId"
    | "helperText"
    | "icon"
    | "initialName"
    | "initialPermissions"
  >,
) {
  const { t } = useTranslation();
  const helperText =
    t("api_key_no_keys").split(".")[1] ||
    "Select READ for view-only access, or WRITE for full control.";

  return (
    <ApiKeyFormDialog
      {...props}
      title={t("new_api_key")}
      submitLabel={t("create_api_key")}
      nameInputId="key-name"
      helperText={helperText}
      icon={<Key className="h-4 w-4 text-primary" />}
    />
  );
}

interface EditApiKeyDialogProps
  extends Omit<
    ApiKeyFormDialogProps,
    | "open"
    | "title"
    | "submitLabel"
    | "nameInputId"
    | "icon"
    | "initialName"
    | "initialPermissions"
  > {
  apiKeyName: string;
  apiKeyPermissions: ApiKeyPermission[];
  open: boolean;
}

export function EditApiKeyDialog({
  apiKeyName,
  apiKeyPermissions,
  ...props
}: EditApiKeyDialogProps) {
  const { t } = useTranslation();

  return (
    <ApiKeyFormDialog
      {...props}
      title={t("edit_subscription")}
      submitLabel={t("save")}
      nameInputId="edit-key-name"
      initialName={apiKeyName}
      initialPermissions={apiKeyPermissions}
      icon={<Pencil className="h-4 w-4 text-primary" />}
    />
  );
}
