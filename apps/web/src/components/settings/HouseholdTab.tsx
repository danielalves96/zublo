import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { householdService } from "@/services/household";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Edit2, Check, X, Users } from "lucide-react";

export function HouseholdTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const { data: members = [], isLoading } = useQuery({
    queryKey: queryKeys.household.all(user?.id ?? ""),
    queryFn: () => householdService.list(user!.id),
    enabled: !!user?.id,
  });

  const createMut = useMutation({
    mutationFn: (name: string) => householdService.create(user!.id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.household.all(user?.id ?? "") });
      setNewName("");
      setIsAdding(false);
      toast.success(t("success_create"));
    },
    onError: () => toast.error(t("error")),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => householdService.update(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.household.all(user?.id ?? "") });
      setEditingId(null);
      toast.success(t("success_update"));
    },
    onError: () => toast.error(t("error")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => householdService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.household.all(user?.id ?? "") });
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
          <Button onClick={() => setIsAdding(true)} className="rounded-xl shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4 mr-2" />
            {t("add")}
          </Button>
        )}
      </div>

      <Separator />

      <div className="space-y-3">
        {isAdding && (
          <div className="flex items-center gap-3 p-2 rounded-2xl border border-primary/50 bg-primary/5">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("member_name_placeholder")}
              className="border-0 bg-transparent focus-visible:ring-0 text-base"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button size="icon" variant="ghost" className="shrink-0 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={handleAdd}>
              <Check className="w-5 h-5" />
            </Button>
            <Button size="icon" variant="ghost" className="shrink-0 text-muted-foreground" onClick={() => setIsAdding(false)}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-2xl bg-muted/50 animate-pulse" />
            ))}
          </div>
        ) : members.length === 0 && !isAdding ? (
          <div className="text-center py-12 border border-dashed rounded-3xl text-muted-foreground">
            <Users className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>{t("no_household_members")}</p>
          </div>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-4 rounded-2xl border bg-card hover:bg-muted/30 transition-colors group"
            >
              {editingId === member.id ? (
                <div className="flex items-center w-full gap-3">
                  <Input
                    autoFocus
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="border-muted bg-background focus-visible:ring-primary h-10 text-base"
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(member.id)}
                  />
                  <Button size="icon" variant="ghost" className="shrink-0 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={() => handleUpdate(member.id)}>
                    <Check className="w-5 h-5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="shrink-0" onClick={() => setEditingId(null)}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <>
                  <span className="font-medium text-lg">{member.name}</span>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => {
                        setEditingId(member.id);
                        setEditingName(member.name);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (confirm(t("confirm_delete"))) deleteMut.mutate(member.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
