import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { HouseholdMemberFormRow } from "@/components/settings/household/HouseholdMemberFormRow";
import { HouseholdMemberListItem } from "@/components/settings/household/HouseholdMemberListItem";
import { householdService } from "@/services/household";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Users } from "lucide-react";

export function HouseholdTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: queryKeys.household.all(user?.id ?? ""),
    queryFn: () => householdService.list(user!.id),
    enabled: !!user?.id,
  });

  const createMut = useMutation({
    mutationFn: (name: string) => householdService.create(user!.id, name),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.household.all(user?.id ?? ""),
      });
      setNewName("");
      setIsAdding(false);
      toast.success(t("success_create"));
    },
    onError: () => toast.error(t("error")),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      householdService.update(id, name),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.household.all(user?.id ?? ""),
      });
      setEditingId(null);
      toast.success(t("success_update"));
    },
    onError: () => toast.error(t("error")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => householdService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.household.all(user?.id ?? ""),
      });
      toast.success(t("success_delete"));
    },
    onError: () => toast.error(t("error")),
  });

  const handleAdd = () => {
    if (!newName.trim()) return;
    createMut.mutate(newName);
  };

  const handleUpdate = (id: string) => {
    if (!editingName.trim()) return;
    updateMut.mutate({ id, name: editingName });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Users className="w-8 h-8 text-primary" />
            {t("household")}
          </h2>
          <p className="text-muted-foreground">{t("household_desc")}</p>
        </div>
        {!isAdding && (
          <Button
            onClick={() => setIsAdding(true)}
            className="rounded-xl shadow-lg shadow-primary/20"
          >
            <Plus className="w-4 h-4 mr-2" />
            {t("add")}
          </Button>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        {isAdding && (
          <HouseholdMemberFormRow
            name={newName}
            onNameChange={setNewName}
            onSubmit={handleAdd}
            onCancel={() => setIsAdding(false)}
          />
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-2xl bg-muted/50 animate-pulse"
              />
            ))}
          </div>
        ) : members.length === 0 && !isAdding ? (
          <div className="text-center py-12 border border-dashed rounded-3xl text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>{t("no_household_members")}</p>
          </div>
        ) : (
          members.map((member) =>
            editingId === member.id ? (
              <HouseholdMemberFormRow
                key={member.id}
                name={editingName}
                onNameChange={setEditingName}
                onSubmit={() => handleUpdate(member.id)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <HouseholdMemberListItem
                key={member.id}
                memberName={member.name}
                onEdit={() => {
                  setEditingId(member.id);
                  setEditingName(member.name);
                }}
                onDelete={() => {
                  setPendingDeleteId(member.id);
                }}
              />
            ),
          )
        )}
      </div>

      <ConfirmDialog
        open={!!pendingDeleteId}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteId(null);
        }}
        title={t("delete")}
        description={t("confirm_delete")}
        onConfirm={() => {
          if (!pendingDeleteId) return;
          deleteMut.mutate(pendingDeleteId);
          setPendingDeleteId(null);
        }}
      />
    </div>
  );
}
