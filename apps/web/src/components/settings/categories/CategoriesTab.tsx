import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { CategoryFormRow } from "@/components/settings/categories/CategoryFormRow";
import { CategoryListItem } from "@/components/settings/categories/CategoryListItem";
import { categoriesService } from "@/services/categories";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Separator } from "@/components/ui/separator";
import { Plus, Tag } from "lucide-react";

export function CategoriesTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: queryKeys.categories.all(user?.id ?? ""),
    queryFn: () => categoriesService.list(user!.id),
    enabled: !!user?.id,
  });

  const createMut = useMutation({
    mutationFn: (name: string) => categoriesService.create(user!.id, name),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.categories.all(user?.id ?? ""),
      });
      setNewCategoryName("");
      setIsAdding(false);
      toast.success(t("success_create"));
    },
    onError: () => toast.error(t("error")),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      categoriesService.update(id, name),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.categories.all(user?.id ?? ""),
      });
      setEditingId(null);
      toast.success(t("success_update"));
    },
    onError: () => toast.error(t("error")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => categoriesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({
        queryKey: queryKeys.categories.all(user?.id ?? ""),
      });
      toast.success(t("success_delete"));
    },
    onError: () => toast.error(t("error")),
  });

  const handleAdd = () => {
    if (!newCategoryName.trim()) return;
    createMut.mutate(newCategoryName);
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
            <Tag className="w-8 h-8 text-primary" />
            {t("categories")}
          </h2>
          <p className="text-muted-foreground">{t("categories_desc")}</p>
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
          <CategoryFormRow
            name={newCategoryName}
            onNameChange={setNewCategoryName}
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
        ) : categories.length === 0 && !isAdding ? (
          <div className="text-center py-12 border border-dashed rounded-3xl text-muted-foreground">
            <Tag className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>{t("no_categories")}</p>
          </div>
        ) : (
          categories.map((cat) =>
            editingId === cat.id ? (
              <CategoryFormRow
                key={cat.id}
                name={editingName}
                onNameChange={setEditingName}
                onSubmit={() => handleUpdate(cat.id)}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <CategoryListItem
                key={cat.id}
                categoryName={cat.name}
                onEdit={() => {
                  setEditingId(cat.id);
                  setEditingName(cat.name);
                }}
                onDelete={() => {
                  setPendingDeleteId(cat.id);
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
