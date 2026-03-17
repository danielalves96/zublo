import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import pb from "@/lib/pb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/lib/toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type {
  Subscription,
  Currency,
  Category,
  PaymentMethod,
  Household,
} from "@/types";
import {
  Plus,
  Search,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { SubscriptionFormModal } from "@/components/SubscriptionFormModal";
import { SubscriptionCard } from "@/components/subscriptions/SubscriptionCard";

type SortKey = "name" | "price" | "date" | "status";
type FilterState = {
  categories: string[];
  members: string[];
  payments: string[];
  state: "all" | "active" | "inactive";
};

export function SubscriptionsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id ?? "";

  const [searchTerm, setSearchTerm] = useState("");
  const [sort, setSort] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<FilterState>({
    categories: [],
    members: [],
    payments: [],
    state: "all",
  });
  const [showForm, setShowForm] = useState(false);
  const [editSub, setEditSub] = useState<Subscription | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const { data: subs = [], isLoading } = useQuery({
    queryKey: ["subscriptions", userId],
    queryFn: () =>
      pb.collection("subscriptions").getFullList<Subscription>({
        filter: `user = "${userId}"`,
        expand: "currency,cycle,category,payment_method,payer",
      }),
    enabled: !!userId,
  });

  const { data: currencies = [] } = useQuery({
    queryKey: ["currencies", userId],
    queryFn: () =>
      pb.collection("currencies").getFullList<Currency>({
        filter: `user = "${userId}"`,
      }),
    enabled: !!userId,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", userId],
    queryFn: () =>
      pb.collection("categories").getFullList<Category>({
        filter: `user = "${userId}"`,
      }),
    enabled: !!userId,
  });

  const { data: paymentMethods = [] } = useQuery({
    queryKey: ["payment_methods", userId],
    queryFn: () =>
      pb.collection("payment_methods").getFullList<PaymentMethod>({
        filter: `user = "${userId}"`,
        sort: "order",
      }),
    enabled: !!userId,
  });

  const { data: household = [] } = useQuery({
    queryKey: ["household", userId],
    queryFn: () =>
      pb.collection("household").getFullList<Household>({
        filter: `user = "${userId}"`,
      }),
    enabled: !!userId,
  });

  const mainCurrency = currencies.find((c) => c.is_main);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => pb.collection("subscriptions").delete(id),
    onSuccess: () => {
      toast.success(t("subscription_deleted"));
      qc.invalidateQueries({ queryKey: ["subscriptions", userId] });
      setDeleteId(null);
    },
    onError: () => toast.error(t("error_deleting_subscription")),
  });

  const cloneMutation = useMutation({
    mutationFn: (id: string) =>
      fetch("/api/subscription/clone", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify({ id }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success(t("success"));
      qc.invalidateQueries({ queryKey: ["subscriptions", userId] });
    },
    onError: () => toast.error(t("unknown_error")),
  });

  const renewMutation = useMutation({
    mutationFn: (id: string) =>
      fetch("/api/subscription/renew", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${pb.authStore.token}`,
        },
        body: JSON.stringify({ id }),
      }).then((r) => r.json()),
    onSuccess: () => {
      toast.success(t("success"));
      qc.invalidateQueries({ queryKey: ["subscriptions", userId] });
    },
    onError: () => toast.error(t("unknown_error")),
  });

  const handleExport = async (format: "json" | "xlsx") => {
    try {
      const res = await fetch("/api/subscriptions/export", {
        headers: { Authorization: `Bearer ${pb.authStore.token}` },
      });
      const data = await res.json();

      if (format === "json") {
        const blob = new Blob([JSON.stringify(data.subscriptions, null, 2)], {
          type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "zublo-subscriptions.json";
        a.click();
        URL.revokeObjectURL(url);
      } else if (format === "xlsx") {
        const XLSX = await import("xlsx");
        const ws = XLSX.utils.json_to_sheet(data.subscriptions);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Subscriptions");
        XLSX.writeFile(wb, "zublo-subscriptions.xlsx");
      }
    } catch (err) {
      toast.error(t("unknown_error"));
    }
  };

  // Filter and sort subscriptions
  const filtered = useMemo(() => {
    let result = [...subs];

    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }

    if (filters.state === "active") result = result.filter((s) => !s.inactive);
    else if (filters.state === "inactive")
      result = result.filter((s) => s.inactive);

    if (filters.categories.length > 0) {
      result = result.filter((s) =>
        filters.categories.includes(s.category ?? ""),
      );
    }

    if (filters.members.length > 0) {
      result = result.filter((s) => filters.members.includes(s.payer ?? ""));
    }

    if (filters.payments.length > 0) {
      result = result.filter((s) =>
        filters.payments.includes(s.payment_method ?? ""),
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sort === "name") cmp = a.name.localeCompare(b.name);
      else if (sort === "price") cmp = a.price - b.price;
      else if (sort === "date")
        cmp = (a.next_payment || "").localeCompare(b.next_payment || "");
      else if (sort === "status") cmp = Number(a.inactive) - Number(b.inactive);
      return sortDir === "asc" ? cmp : -cmp;
    });

    if (user?.disabled_to_bottom) {
      result.sort((a, b) => Number(a.inactive) - Number(b.inactive));
    }

    return result;
  }, [subs, searchTerm, filters, sort, sortDir, user?.disabled_to_bottom]);

  const cycleSort = (sortKey: SortKey) => {
    if (sort === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(sortKey);
      setSortDir("asc");
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t("subscriptions")}
          </h1>
          <p className="text-muted-foreground mt-1">Manage and track your active and inactive subscriptions.</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-xl shadow-sm border bg-background/50 backdrop-blur">
                {t("export")}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40 rounded-xl" align="end">
              <DropdownMenuItem className="cursor-pointer" onClick={() => handleExport("json")}>
                JSON Format
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => handleExport("xlsx")}>
                Excel (XLSX)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            className="rounded-xl shadow-md w-full sm:w-auto bg-gradient-to-r from-primary/90 to-primary hover:from-primary hover:to-primary/90 transition-all font-semibold"
            onClick={() => {
              setEditSub(null);
              setShowForm(true);
            }}
          >
            <Plus className="h-5 w-5 mr-1.5" />
            {t("add_subscription")}
          </Button>
        </div>
      </div>

      {/* Search & Filter bar */}
      <div className="bg-card/40 backdrop-blur-md rounded-2xl border p-2 flex flex-col md:flex-row gap-2 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={t("search") + "..."}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 rounded-xl bg-background/50 border-transparent placeholder:text-muted-foreground/60 h-11 text-base focus-visible:ring-1 focus-visible:ring-primary/50"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className={cn("rounded-xl h-11 px-4 gap-2 bg-background/50 border-transparent hover:bg-accent/50", showFilters && "bg-accent/80 border-border")}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className={cn("h-4 w-4", showFilters ? "text-primary" : "text-muted-foreground")} />
            <span className="hidden sm:inline">{t("filter")}</span>
          </Button>
          <Button variant="outline" className="rounded-xl h-11 px-4 gap-2 bg-background/50 border-transparent hover:bg-accent/50" onClick={() => cycleSort("name")}>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
            <span className="hidden sm:inline">{t("sort")}</span>
          </Button>
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="rounded-2xl border bg-card/40 backdrop-blur-md p-5 space-y-5 shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-1.5 uppercase tracking-wider"><Filter className="w-3.5 h-3.5" /> State</h3>
            <div className="flex gap-2 flex-wrap">
              {(["all", "active", "inactive"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setFilters((f) => ({ ...f, state: s }))}
                  className={cn(
                    "text-sm font-medium rounded-xl px-4 py-1.5 border transition-all duration-200",
                    filters.state === s
                      ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                      : "bg-background/50 hover:bg-accent/60 border-transparent hover:border-border text-muted-foreground",
                  )}
                >
                  {t(s === "all" ? "all" : s === "active" ? "active" : "inactive_label")}
                </button>
              ))}
            </div>
          </div>
          
          {categories.length > 0 && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-1.5 uppercase tracking-wider">Category</h3>
              <div className="flex gap-2 flex-wrap">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() =>
                      setFilters((f) => ({
                        ...f,
                        categories: f.categories.includes(c.id)
                          ? f.categories.filter((id) => id !== c.id)
                          : [...f.categories, c.id],
                      }))
                    }
                    className={cn(
                      "text-sm font-medium rounded-xl px-4 py-1.5 border transition-all duration-200",
                      filters.categories.includes(c.id)
                        ? "bg-primary text-primary-foreground border-primary shadow-sm ring-2 ring-primary/20"
                        : "bg-background/50 hover:bg-accent/60 border-transparent hover:border-border text-muted-foreground",
                    )}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Subscription list */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="h-36 rounded-2xl border bg-card/40 animate-pulse backdrop-blur-sm"
            />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center bg-card/30 backdrop-blur-md rounded-2xl border border-dashed p-12">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <p className="text-lg font-medium text-foreground">{t("no_subscriptions")}</p>
          <p className="text-muted-foreground mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((sub) => (
            <SubscriptionCard
              key={sub.id}
              sub={sub}
              mainCurrency={mainCurrency}
              currencies={currencies}
              showMonthly={user?.monthly_price}
              showProgress={user?.subscription_progress}
              onEdit={() => {
                setEditSub(sub);
                setShowForm(true);
              }}
              onClone={() => cloneMutation.mutate(sub.id)}
              onRenew={() => renewMutation.mutate(sub.id)}
              onDelete={() => setDeleteId(sub.id)}
            />
          ))}
        </div>
      )}

      {/* Add/Edit form modal */}
      {showForm && (
        <SubscriptionFormModal
          sub={editSub}
          userId={userId}
          currencies={currencies}
          categories={categories}
          paymentMethods={paymentMethods}
          household={household}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            qc.invalidateQueries({ queryKey: ["subscriptions", userId] });
          }}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-3xl border-border/50 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-bold">{t("delete_subscription")}</AlertDialogTitle>
            <AlertDialogDescription className="text-base">
              {t("confirm_delete_subscription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4">
            <AlertDialogCancel className="rounded-xl">{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
