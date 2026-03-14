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
import { Progress } from "@/components/ui/progress";
import { toast } from "@/lib/toast";
import {
  formatPrice,
  toMonthly,
  formatDate,
  daysUntil,
  subscriptionProgress,
} from "@/lib/utils";
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
  Copy,
  RefreshCw,
  Trash2,
  Edit,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { SubscriptionFormModal } from "@/components/SubscriptionFormModal";
import { cn } from "@/lib/utils";

// ── Payment method icon helpers ───────────────────────────────────────────────

const PAYMENT_ICON_MAP: Record<string, string> = {
  "visa": "Visa.png", "mastercard": "Mastercard.png",
  "american express": "Amex.png", "amex": "Amex.png",
  "discover": "Discover.png", "diners club": "DinersClub.png",
  "jcb": "JCB.png", "unionpay": "unionpay.png", "union pay": "unionpay.png",
  "maestro": "Maestro.png", "paypal": "PayPal.png",
  "apple pay": "ApplePay.png", "google pay": "GooglePay.png",
  "samsung pay": "samsungpay.png", "amazon pay": "amazonpay.png",
  "alipay": "alipay.png", "wechat pay": "wechat.png", "wechat": "wechat.png",
  "venmo": "venmo.png", "stripe": "Stripe.png", "klarna": "Klarna.png",
  "affirm": "affirm.png", "skrill": "skrill.png",
  "paysafecard": "paysafe.png", "paysafe": "paysafe.png",
  "ideal": "ideal.png", "bancontact": "bancontact.png",
  "giropay": "gitopay.png", "sofort": "sofort.png",
  "payoneer": "Payoneer.png", "interac": "Interac.png",
  "bitcoin": "Bitcoin.png", "bitcoin cash": "BitcoinCash.png",
  "ethereum": "Etherium.png", "litecoin": "Lightcoin.png",
  "direct debit": "directdebit.png", "directdebit": "directdebit.png",
  "shop pay": "shoppay.png", "shoppay": "shoppay.png",
  "facebook pay": "facebookpay.png",
};

function getPaymentIconSrc(method: PaymentMethod): string | null {
  if (method.icon) return pb.files.getUrl(method, method.icon);
  const key = method.name.toLowerCase();
  return PAYMENT_ICON_MAP[key] ? `/assets/payments/${PAYMENT_ICON_MAP[key]}` : null;
}

function PaymentMethodIcon({ method }: { method: PaymentMethod }) {
  const [err, setErr] = useState(false);
  const src = getPaymentIconSrc(method);
  if (src && !err) {
    return (
      <img
        src={src}
        alt={method.name}
        title={method.name}
        className="h-7 w-10 rounded object-contain bg-white p-0.5 shrink-0"
        onError={() => setErr(true)}
      />
    );
  }
  const initials = method.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  return (
    <span
      title={method.name}
      className="h-7 w-10 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground shrink-0"
    >
      {initials}
    </span>
  );
}

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

  const handleExport = async () => {
    const res = await fetch("/api/subscriptions/export", {
      headers: { Authorization: `Bearer ${pb.authStore.token}` },
    });
    const data = await res.json();
    const blob = new Blob([JSON.stringify(data.subscriptions, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "zublo-subscriptions.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter and sort subscriptions
  const filtered = useMemo(() => {
    let result = [...subs];

    // Text search
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      result = result.filter((s) => s.name.toLowerCase().includes(q));
    }

    // State filter
    if (filters.state === "active") result = result.filter((s) => !s.inactive);
    else if (filters.state === "inactive")
      result = result.filter((s) => s.inactive);

    // Category filter
    if (filters.categories.length > 0) {
      result = result.filter((s) =>
        filters.categories.includes(s.category ?? ""),
      );
    }

    // Member filter
    if (filters.members.length > 0) {
      result = result.filter((s) => filters.members.includes(s.payer ?? ""));
    }

    // Payment filter
    if (filters.payments.length > 0) {
      result = result.filter((s) =>
        filters.payments.includes(s.payment_method ?? ""),
      );
    }

    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sort === "name") cmp = a.name.localeCompare(b.name);
      else if (sort === "price") cmp = a.price - b.price;
      else if (sort === "date")
        cmp = (a.next_payment || "").localeCompare(b.next_payment || "");
      else if (sort === "status") cmp = Number(a.inactive) - Number(b.inactive);
      return sortDir === "asc" ? cmp : -cmp;
    });

    // disabled_to_bottom
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
          <Button variant="outline" className="rounded-xl shadow-sm border bg-background/50 backdrop-blur" onClick={handleExport}>
            {t("export")}
          </Button>
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

function SubscriptionCard({
  sub,
  mainCurrency: _mainCurrency,
  currencies: _currencies,
  showMonthly,
  showProgress,
  onEdit,
  onClone,
  onRenew,
  onDelete,
}: {
  sub: Subscription;
  mainCurrency?: Currency;
  currencies: Currency[];
  showMonthly?: boolean;
  showProgress?: boolean;
  onEdit: () => void;
  onClone: () => void;
  onRenew: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const currency = sub.expand?.currency;
  const cycleName = sub.expand?.cycle?.name ?? "Monthly";
  const category = sub.expand?.category;
  const payer = sub.expand?.payer;
  const paymentMethod = sub.expand?.payment_method;

  const price = showMonthly
    ? toMonthly(sub.price, cycleName, sub.frequency || 1)
    : sub.price;
  const symbol = currency?.symbol ?? "$";
  const days = daysUntil(sub.next_payment);
  const progress = showProgress
    ? subscriptionProgress(sub.start_date, sub.next_payment)
    : 0;

  return (
    <div
      className={cn(
        "group relative rounded-2xl border bg-card/60 backdrop-blur-sm p-5 transition-all duration-300 hover:shadow-lg hover:bg-card hover:-translate-y-1 flex flex-col justify-between overflow-hidden",
        sub.inactive && "opacity-60 grayscale-[0.3]"
      )}
    >
      <div className="absolute -z-10 bg-gradient-to-br from-primary/5 to-transparent w-full h-full top-0 left-0 transition-opacity opacity-0 group-hover:opacity-100" />
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 shrink-0 rounded-2xl overflow-hidden bg-background shadow-sm border flex items-center justify-center text-xl font-bold">
            {sub.logo ? (
              <img
                src={pb.files.getUrl(sub, sub.logo)}
                alt={sub.name}
                className="h-full w-full object-cover p-1 rounded-2xl"
              />
            ) : (
              <span className="bg-primary/10 text-primary w-full h-full flex items-center justify-center">{sub.name[0]?.toUpperCase()}</span>
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg leading-tight line-clamp-1 group-hover:text-primary transition-colors">{sub.name}</h3>
            {category && (
              <span className="text-xs font-medium text-muted-foreground mr-2">
                {category.name}
              </span>
            )}
            {sub.inactive && (
              <span className="text-[10px] uppercase font-bold tracking-wider rounded-md bg-destructive/10 text-destructive px-1.5 py-0.5">
                {t("inactive_label")}
              </span>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <p className="font-extrabold text-xl font-mono text-foreground tracking-tight">
            {formatPrice(price, symbol)}
          </p>
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {showMonthly ? "Monthly" : cycleName}
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {sub.next_payment && !sub.inactive && (
          <div className="flex items-center justify-between text-sm bg-background/50 border rounded-xl px-3 py-2">
            <span className="text-muted-foreground flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Next</span>
            <div className="font-medium text-foreground flex items-center gap-2">
              {formatDate(sub.next_payment)}
              {days >= 0 && (
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full",
                    days <= 3 ? "bg-orange-500/10 text-orange-600 font-bold" : "bg-primary/10 text-primary font-semibold"
                  )}
                >
                  {days}d
                </span>
              )}
            </div>
          </div>
        )}

        {showProgress && progress > 0 && !sub.inactive && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-1">
              <span>Billing Cycle</span>
              <span className={days <= 3 ? "text-orange-500 font-bold" : ""}>{days}d</span>
            </div>
            <Progress value={progress} className="h-2 rounded-full bg-accent [&>div]:bg-primary/80" />
          </div>
        )}
      </div>

      <div className="mt-5 pt-4 border-t flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {paymentMethod && <PaymentMethodIcon method={paymentMethod} />}
          {payer && <span className="font-medium text-foreground/80">Pays: {payer.name}</span>}
        </div>
        
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur rounded-full p-1 border shadow-sm absolute bottom-4 right-4">
          {sub.url && (
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10" onClick={() => window.open(sub.url, "_blank")} title="Open URL">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10" onClick={onEdit} title="Edit">
            <Edit className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-green-500 hover:bg-green-500/10" onClick={onClone} title="Clone">
            <Copy className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10" onClick={onRenew} title="Renew">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10" onClick={onDelete} title="Delete">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
