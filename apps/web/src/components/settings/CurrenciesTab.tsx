import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { currenciesService } from "@/services/currencies";
import { usersService } from "@/services/users";
import { fixerService } from "@/services/fixer";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash2, Edit2, Check, X, Banknote, Star } from "lucide-react";
import type { Currency } from "@/types";

export function CurrenciesTab() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();

  const [isAdding, setIsAdding] = useState(false);
  const [newCurrency, setNewCurrency] = useState({ name: "", code: "", symbol: "" });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingData, setEditingData] = useState({ name: "", code: "", symbol: "" });

  const { data: currencies = [], isLoading } = useQuery({
    queryKey: queryKeys.currencies.all(user?.id ?? ""),
    queryFn: () => currenciesService.list(user!.id),
    enabled: !!user?.id,
  });

  // Needed to auto-refresh rates when main currency changes
  const { data: fixerSettings } = useQuery({
    queryKey: ["fixer_settings", user?.id ?? ""],
    queryFn: () => fixerService.getSettings(user!.id),
    enabled: !!user?.id,
  });

  const createMut = useMutation({
    mutationFn: (data: Partial<Currency>) => currenciesService.create(user!.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.currencies.all(user?.id ?? "") });
      setNewCurrency({ name: "", code: "", symbol: "" });
      setIsAdding(false);
      toast.success(t("success_create"));
    },
    onError: () => toast.error(t("error")),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Currency> }) =>
      currenciesService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.currencies.all(user?.id ?? "") });
      setEditingId(null);
      toast.success(t("success_update"));
    },
    onError: () => toast.error(t("error")),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => currenciesService.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.currencies.all(user?.id ?? "") });
      toast.success(t("success_delete"));
    },
    onError: () => toast.error(t("error")),
  });

  const handleAdd = () => {
    if (!newCurrency.code.trim()) return;
    createMut.mutate(newCurrency);
  };

  const handleUpdate = (id: string) => {
    if (!editingData.code.trim()) return;
    updateMut.mutate({ id, data: editingData });
  };

  const setMainCurrency = async (id: string) => {
    try {
      const mains = currencies.filter((c) => c.is_main);
      for (const cur of mains) {
        await currenciesService.update(cur.id, { is_main: false });
      }
      await currenciesService.update(id, { is_main: true });
      // Keep user.main_currency in sync so backend rate normalization uses correct base
      await usersService.update(user!.id, { main_currency: id });
      qc.invalidateQueries({ queryKey: queryKeys.currencies.all(user?.id ?? "") });
      toast.success(t("success_update"));

      // Rates are relative to the main currency — auto-refresh when base changes
      if (fixerSettings?.api_key) {
        fixerService.updateRates()
          .then(() => qc.invalidateQueries({ queryKey: queryKeys.currencies.all(user?.id ?? "") }))
          .catch(() => {});
      }
    } catch {
      toast.error(t("error"));
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Banknote className="w-8 h-8 text-primary" />
            {t("currencies")}
          </h2>
          <p className="text-muted-foreground">{t("currencies_desc")}</p>
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
          <div className="flex items-center gap-3 p-3 rounded-2xl border border-primary/50 bg-primary/5">
            <Input
              autoFocus
              value={newCurrency.code}
              onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value })}
              placeholder={t("currency_code_placeholder")}
              className="w-24 bg-background"
            />
            <Input
              value={newCurrency.symbol}
              onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
              placeholder={t("currency_symbol_placeholder")}
              className="w-24 bg-background"
            />
            <Input
              value={newCurrency.name}
              onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
              placeholder={t("currency_name_placeholder")}
              className="flex-1 bg-background"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
              onClick={handleAdd}
            >
              <Check className="w-5 h-5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="shrink-0 text-muted-foreground"
              onClick={() => setIsAdding(false)}
            >
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
        ) : currencies.length === 0 && !isAdding ? (
          <div className="text-center py-12 border border-dashed rounded-3xl text-muted-foreground">
            <Banknote className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>{t("no_currencies")}</p>
          </div>
        ) : (
          currencies.map((cur) => (
            <div
              key={cur.id}
              className={`flex items-center justify-between p-4 rounded-2xl border transition-colors group ${
                cur.is_main
                  ? "bg-primary/5 border-primary/20 shadow-sm"
                  : "bg-card hover:bg-muted/30"
              }`}
            >
              {editingId === cur.id ? (
                <div className="flex items-center w-full gap-3">
                  <Input
                    autoFocus
                    value={editingData.code}
                    onChange={(e) => setEditingData({ ...editingData, code: e.target.value })}
                    className="w-24 bg-background h-10"
                  />
                  <Input
                    value={editingData.symbol}
                    onChange={(e) => setEditingData({ ...editingData, symbol: e.target.value })}
                    className="w-24 bg-background h-10"
                  />
                  <Input
                    value={editingData.name}
                    onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                    className="flex-1 bg-background h-10"
                    onKeyDown={(e) => e.key === "Enter" && handleUpdate(cur.id)}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                    onClick={() => handleUpdate(cur.id)}
                  >
                    <Check className="w-5 h-5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="shrink-0"
                    onClick={() => setEditingId(null)}
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => !cur.is_main && setMainCurrency(cur.id)}
                      className={`p-2 rounded-full transition-colors ${
                        cur.is_main
                          ? "text-yellow-500 bg-yellow-500/10 hover:bg-yellow-500/20"
                          : "text-muted-foreground hover:bg-muted opacity-0 group-hover:opacity-100"
                      }`}
                      title={cur.is_main ? "Main Currency" : "Set as Main"}
                    >
                      <Star className={`w-5 h-5 ${cur.is_main ? "fill-current" : ""}`} />
                    </button>
                    <div>
                      <span className="font-semibold text-lg">{cur.code}</span>
                      <span className="text-muted-foreground ml-2 px-2 py-0.5 rounded-md bg-muted text-sm">
                        {cur.symbol}
                      </span>
                      {cur.name && (
                        <span className="text-muted-foreground ml-3 text-sm">{cur.name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                    {!cur.is_main && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setEditingId(cur.id);
                          setEditingData({ code: cur.code, symbol: cur.symbol, name: cur.name });
                        }}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                    )}
                    {!cur.is_main && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm(t("confirm_delete"))) deleteMut.mutate(cur.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
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
