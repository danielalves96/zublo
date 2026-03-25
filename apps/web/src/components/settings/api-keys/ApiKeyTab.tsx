import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Key } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { ApiKeyEndpointsReference } from "@/components/settings/api-keys/ApiKeyEndpointsReference";
import {
  CreateApiKeyDialog,
  EditApiKeyDialog,
} from "@/components/settings/api-keys/ApiKeyFormDialog";
import { ApiKeyListCard } from "@/components/settings/api-keys/ApiKeyListCard";
import { ApiKeyRevealDialog } from "@/components/settings/api-keys/ApiKeyRevealDialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { apiKeysService } from "@/services/apiKeys";
import type { ApiKey, ApiKeyCreated, ApiKeyPermission } from "@/types";

export function ApiKeyTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const userId = user?.id ?? "";

  const [showCreate, setShowCreate] = useState(false);
  const [justCreated, setJustCreated] = useState<ApiKeyCreated | null>(null);
  const [pendingEditKey, setPendingEditKey] = useState<ApiKey | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: keys = [], isLoading } = useQuery({
    queryKey: queryKeys.apiKeys(userId),
    queryFn: () => apiKeysService.list(),
    enabled: !!userId,
  });

  const createMutation = useMutation({
    mutationFn: ({
      name,
      permissions,
    }: {
      name: string;
      permissions: ApiKeyPermission[];
    }) => apiKeysService.create(name, permissions),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys(userId) });
      setShowCreate(false);
      setJustCreated(created);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      name,
      permissions,
    }: {
      id: string;
      name: string;
      permissions: ApiKeyPermission[];
    }) => apiKeysService.update(id, name, permissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys(userId) });
      setPendingEditKey(null);
      toast.success(t("success"));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiKeysService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys(userId) });
      toast.success(t("success"));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleDelete = (id: string) => {
    if (!keys.find((key) => key.id === id)) {
      return;
    }

    setPendingDeleteId(id);
  };

  return (
    <div className="animate-in slide-in-from-bottom-4 space-y-8 fade-in duration-500">
      <div>
        <h2 className="mb-2 flex items-center gap-3 text-3xl font-bold tracking-tight">
          <Key className="h-8 w-8 text-primary" />
          {t("api_keys")}
        </h2>
        <p className="text-muted-foreground">{t("api_key_tab_desc")}</p>
      </div>

      <Separator />

      <ApiKeyListCard
        keys={keys}
        isLoading={isLoading}
        onCreate={() => setShowCreate(true)}
        onEdit={setPendingEditKey}
        onDelete={handleDelete}
      />

      <ApiKeyEndpointsReference />

      <CreateApiKeyDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onSubmit={(name, permissions) =>
          createMutation.mutate({ name, permissions })
        }
        isPending={createMutation.isPending}
      />

      <ApiKeyRevealDialog
        created={justCreated}
        onClose={() => setJustCreated(null)}
      />

      <ConfirmDialog
        open={!!pendingDeleteId}
        onOpenChange={(nextOpen) => !nextOpen && setPendingDeleteId(null)}
        title={t("api_key_delete")}
        description={t("api_key_confirm_delete", {
          name: keys.find((key) => key.id === pendingDeleteId)?.name ?? "",
        })}
        confirmLabel={t("api_key_delete")}
        onConfirm={() => {
          /* v8 ignore next */
          if (pendingDeleteId) {
            deleteMutation.mutate(pendingDeleteId);
          }

          setPendingDeleteId(null);
        }}
      />

      <EditApiKeyDialog
        open={!!pendingEditKey}
        apiKeyName={pendingEditKey?.name ?? ""}
        apiKeyPermissions={pendingEditKey?.permissions ?? []}
        onClose={() => setPendingEditKey(null)}
        onSubmit={(name, permissions) => {
          if (!pendingEditKey) {
            return;
          }

          updateMutation.mutate({
            id: pendingEditKey.id,
            name,
            permissions,
          });
        }}
        isPending={updateMutation.isPending}
      />
    </div>
  );
}
