import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ChangeEvent,useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { SubscriptionFormModal } from "@/components/SubscriptionFormModal";
import { SubscriptionsFiltersPanel } from "@/components/subscriptions/SubscriptionsFiltersPanel";
import { SubscriptionsGrid } from "@/components/subscriptions/SubscriptionsGrid";
import {
  INITIAL_SUBSCRIPTION_FILTERS,
  type SubscriptionFiltersState,
  type SubscriptionSortKey,
} from "@/components/subscriptions/subscriptionsPage.types";
import { SubscriptionsPageHeader } from "@/components/subscriptions/SubscriptionsPageHeader";
import { SubscriptionsToolbar } from "@/components/subscriptions/SubscriptionsToolbar";
import { useFilteredSubscriptions } from "@/components/subscriptions/useFilteredSubscriptions";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { categoriesService } from "@/services/categories";
import { currenciesService } from "@/services/currencies";
import { householdService } from "@/services/household";
import { paymentMethodsService } from "@/services/paymentMethods";
import { subscriptionsService } from "@/services/subscriptions";
import type { Subscription } from "@/types";

export function SubscriptionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? "";

  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<SubscriptionSortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<SubscriptionFiltersState>(
    INITIAL_SUBSCRIPTION_FILTERS,
  );
  const [showForm, setShowForm] = useState(false);
  const [editSubscription, setEditSubscription] = useState<Subscription | null>(
    null,
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);

  const { data: subscriptions = [], isLoading } = useQuery({
    queryKey: queryKeys.subscriptions.all(userId),
    queryFn: () => subscriptionsService.list(userId),
    enabled: !!userId,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: queryKeys.currencies.all(userId),
    queryFn: () => currenciesService.list(userId),
    enabled: !!userId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: queryKeys.categories.all(userId),
    queryFn: () => categoriesService.list(userId),
    enabled: !!userId,
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: queryKeys.paymentMethods.all(userId),
    queryFn: () => paymentMethodsService.listForForm(userId),
    enabled: !!userId,
  });

  const { data: household = [] } = useQuery({
    queryKey: queryKeys.household.all(userId),
    queryFn: () => householdService.list(userId),
    enabled: !!userId,
  });

  const mainCurrency = currencies.find((currency) => currency.is_main);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => subscriptionsService.delete(id),
    onSuccess: () => {
      toast.success(t("subscription_deleted"));
      queryClient.invalidateQueries({
        queryKey: queryKeys.subscriptions.all(userId),
      });
      setDeleteId(null);
    },
    onError: () => toast.error(t("error_deleting_subscription")),
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) => subscriptionsService.clone(id),
    onSuccess: () => {
      toast.success(t("success"));
      queryClient.invalidateQueries({
        queryKey: queryKeys.subscriptions.all(userId),
      });
    },
    onError: () => toast.error(t("unknown_error")),
  });

  const renewMutation = useMutation({
    mutationFn: (id: string) => subscriptionsService.renew(id),
    onSuccess: () => {
      toast.success(t("success"));
      queryClient.invalidateQueries({
        queryKey: queryKeys.subscriptions.all(userId),
      });
    },
    onError: () => toast.error(t("unknown_error")),
  });

  const filteredSubscriptions = useFilteredSubscriptions({
    subscriptions,
    searchTerm,
    filters,
    sort,
    sortDir,
    disabledToBottom: user?.disabled_to_bottom,
  });

  const handleExport = async (format: "json" | "xlsx") => {
    try {
      const data = await subscriptionsService.export();

      if (format === "json") {
        const blob = new Blob([JSON.stringify(data.subscriptions, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = "zublo-subscriptions.json";
        anchor.click();
        URL.revokeObjectURL(url);
        return;
      }

      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(data.subscriptions);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Subscriptions");
      XLSX.writeFile(workbook, "zublo-subscriptions.xlsx");
    } catch {
      toast.error(t("unknown_error"));
    }
  };

  const handleImportFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    event.target.value = "";
    setIsImporting(true);

    try {
      const text = await file.text();
      const parsed = JSON.parse(text);

      const importedSubscriptions: unknown[] | null = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed.subscriptions)
          ? parsed.subscriptions
          : null;

      if (!importedSubscriptions) {
        toast.error(t("import_invalid_format"));
        return;
      }

      const result = await subscriptionsService.import(importedSubscriptions);
      queryClient.invalidateQueries({
        queryKey: queryKeys.subscriptions.all(userId),
      });

      if (result.skipped > 0) {
        toast.success(
          t("import_partial", {
            imported: result.imported,
            skipped: result.skipped,
          }),
        );
      } else {
        toast.success(t("import_success", { count: result.imported }));
      }
    } catch {
      toast.error(t("import_error"));
    } finally {
      setIsImporting(false);
    }
  };

  const handleCycleSort = () => {
    if (sort === "name") {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSort("name");
    setSortDir("asc");
  };

  const handleCreate = () => {
    setEditSubscription(null);
    setShowForm(true);
  };

  const handleEdit = (subscription: Subscription) => {
    setEditSubscription(subscription);
    setShowForm(true);
  };

  return (
    <div className="animate-in slide-in-from-bottom-4 space-y-6 fade-in duration-500">
      <SubscriptionsPageHeader
        importInputRef={importInputRef}
        isImporting={isImporting}
        onImportChange={handleImportFile}
        onExport={handleExport}
        onCreate={handleCreate}
      />

      <SubscriptionsToolbar
        searchTerm={searchTerm}
        showFilters={showFilters}
        onSearchChange={setSearchTerm}
        onToggleFilters={() => setShowFilters((current) => !current)}
        onCycleSort={handleCycleSort}
      />

      {showFilters ? (
        <SubscriptionsFiltersPanel
          categories={categories}
          filters={filters}
          onChange={setFilters}
        />
      ) : null}

      <SubscriptionsGrid
        isLoading={isLoading}
        subscriptions={filteredSubscriptions}
        mainCurrency={mainCurrency}
        convertCurrency={user?.convert_currency}
        showMonthly={user?.monthly_price}
        showProgress={user?.subscription_progress}
        onEdit={handleEdit}
        onClone={(id) => cloneMutation.mutate(id)}
        onRenew={(id) => renewMutation.mutate(id)}
        onDelete={setDeleteId}
      />

      {showForm ? (
        <SubscriptionFormModal
          sub={editSubscription}
          userId={userId}
          currencies={currencies}
          categories={categories}
          paymentMethods={paymentMethods}
          household={household}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            queryClient.invalidateQueries({
              queryKey: queryKeys.subscriptions.all(userId),
            });
          }}
        />
      ) : null}

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(nextOpen) => !nextOpen && setDeleteId(null)}
        title={t("delete_subscription")}
        description={t("confirm_delete_subscription")}
        onConfirm={() => deleteId && deleteMutation.mutate(deleteId)}
      />
    </div>
  );
}
