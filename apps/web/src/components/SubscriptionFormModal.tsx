import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Upload } from "lucide-react";
import { useEffect, useRef,useState } from "react";
import { Controller,useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { compressImage } from "@/lib/image";
import { queryKeys } from "@/lib/queryKeys";
import { toast } from "@/lib/toast";
import { cyclesService } from "@/services/cycles";
import { subscriptionsService } from "@/services/subscriptions";
import type {
  Category,
  Currency,
  Household,
  PaymentMethod,
  Subscription,
} from "@/types";

interface Props {
  sub: Subscription | null;
  userId: string;
  currencies: Currency[];
  categories: Category[];
  paymentMethods: PaymentMethod[];
  household: Household[];
  onClose: () => void;
  onSaved: () => void;
}

type LogoResult = {
  previewUrl: string;
  file: File;
  source: string;
  contentType: string;
};

const fetchCycles = () => cyclesService.list();

export function SubscriptionFormModal({
  sub,
  userId,
  currencies,
  categories,
  paymentMethods,
  household,
  onClose,
  onSaved,
}: Props) {
  const { t } = useTranslation();
  const { user: authUser } = useAuth();

  // ── Logo state (stays outside RHF — not form data) ──────────────────────────
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState(""); // source URL of the selected logo
  const [logoSearch, setLogoSearch] = useState("");
  const [logoResults, setLogoResults] = useState<LogoResult[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [showLogoResults, setShowLogoResults] = useState(false);
  const logoSearchRef = useRef<HTMLDivElement>(null);

  // ── Cycles query ─────────────────────────────────────────────────────────────
  const { data: cycles = [] } = useQuery({
    queryKey: queryKeys.cycles(),
    queryFn: fetchCycles,
  });

  // ── Zod schema with i18n messages ────────────────────────────────────────────
  const schema = z.object({
    name: z.string().min(1, t("required")),
    price: z.number().nonnegative(),
    currency: z.string().min(1, t("required")),
    frequency: z.string().min(1, t("required")),
    cycle: z.string().min(1, t("required")),
    next_payment: z.string().min(1, t("required")),
    start_date: z.string().min(1, t("required")),
    payment_method: z.string(),
    payer: z.string(),
    category: z.string(),
    notes: z.string(),
    url: z.string(),
    auto_renew: z.boolean(),
    notify: z.boolean(),
    notify_days_before: z.string(),
    inactive: z.boolean(),
    auto_mark_paid: z.boolean(),
    cancellation_date: z.string(),
  });

  type FormValues = z.infer<typeof schema>;

  const nextMonthDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split("T")[0];
  };

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      price: 0,
      currency: "",
      frequency: "1",
      cycle: "",
      next_payment: nextMonthDate(),
      start_date: new Date().toISOString().split("T")[0],
      payment_method: "",
      payer: "",
      category: "",
      notes: "",
      url: "",
      auto_renew: true,
      notify: false,
      notify_days_before: "3",
      inactive: false,
      auto_mark_paid: false,
      cancellation_date: "",
    },
  });

  const watchedCurrency = watch("currency");
  const watchedNotify = watch("notify");
  const watchedInactive = watch("inactive");

  // ── Pre-fill / reset form when sub or dependencies change ───────────────────
  useEffect(() => {
    if (sub) {
      reset({
        name: sub.name,
        price: sub.price,
        currency: sub.currency,
        frequency: String(sub.frequency),
        cycle: sub.cycle,
        next_payment: sub.next_payment,
        start_date: sub.start_date || new Date().toISOString().split("T")[0],
        payment_method: sub.payment_method || "",
        payer: sub.payer || "",
        category: sub.category || "",
        notes: sub.notes || "",
        url: sub.url || "",
        auto_renew: sub.auto_renew,
        notify: sub.notify,
        notify_days_before: String(sub.notify_days_before || 3),
        inactive: sub.inactive,
        auto_mark_paid: !!sub.auto_mark_paid,
        cancellation_date: sub.cancellation_date || "",
      });
    } else {
      const mainCur = currencies.find((c) => c.is_main);
      const monthCycle = cycles.find((c) => c.name === "Monthly");
      reset({
        name: "",
        price: 0,
        currency: mainCur?.id || currencies[0]?.id || "",
        frequency: "1",
        cycle: monthCycle?.id || cycles[0]?.id || "",
        next_payment: nextMonthDate(),
        start_date: new Date().toISOString().split("T")[0],
        payment_method: "",
        payer: household[0]?.id || "",
        category: "",
        notes: "",
        url: "",
        auto_renew: true,
        notify: false,
        notify_days_before: "3",
        inactive: false,
        auto_mark_paid: false,
        cancellation_date: "",
      });
    }
  }, [sub, currencies, cycles, household, reset]);

  // ── Logo search effect ────────────────────────────────────────────────────────
  useEffect(() => {
    const query = logoSearch.trim();

    if (query.length < 2) {
      setLogoResults([]);
      setShowLogoResults(false);
      setSearching(false);
      return;
    }

    let cancelled = false;
    const abort = new AbortController();

    const fetchWithTimeout = async (url: string) => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 3500);
      try {
        const res = await fetch(url, { signal: controller.signal });
        return res;
      } finally {
        window.clearTimeout(timeout);
      }
    };

    const probeImage = async (
      url: string,
      key: string,
    ): Promise<LogoResult | null> => {
      const lowered = url.toLowerCase();
      if (lowered.includes(".ico")) return null;

      try {
        const res = await fetchWithTimeout(url);
        if (!res.ok) return null;

        const contentType = (
          res.headers.get("content-type") || ""
        ).toLowerCase();
        if (!contentType.startsWith("image/")) return null;
        if (contentType.includes("icon")) return null;

        const blob = await res.blob();
        if (blob.size < 512) return null;

        const type = (contentType || blob.type || "image/png").split(";")[0];

        if (!type.includes("svg")) {
          try {
            const bitmap = await createImageBitmap(blob);
            const tooSmall = bitmap.width < 48 || bitmap.height < 48;
            bitmap.close();
            if (tooSmall) return null;
          } catch {
            // Cannot check dimensions — accept
          }
        }

        const extRaw = type.split("/")[1] || "png";
        const ext = extRaw.replace("svg+xml", "svg");
        const file = new File([blob], `logo-${key}.${ext}`, { type });
        const previewUrl = URL.createObjectURL(blob);
        return { previewUrl, file, source: url, contentType: type };
      } catch {
        return null;
      }
    };

    const collectLogos = async () => {
      setSearching(true);
      setShowLogoResults(true);

      const normalized = query
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();

      const aliasMap: Record<string, string[]> = {
        "amazon prime": ["primevideo", "amazon"],
        "prime video": ["primevideo", "amazon"],
        "disney plus": ["disneyplus", "disney"],
        "chat gpt": ["openai", "chatgpt"],
        chatgpt: ["openai", "chatgpt"],
        "google drive": ["googledrive", "google"],
        "youtube premium": ["youtubepremium", "youtube"],
        spotify: ["spotify"],
        hbo: ["hbomax", "hbo"],
        "hbo max": ["hbomax", "hbo"],
        "paramount plus": ["paramountplus", "paramount"],
      };

      const words = normalized.split(/\s+/).filter(Boolean);
      const compact = normalized.replace(/[^a-z0-9]/g, "");

      const inferDomain = (value: string) => {
        const key = value.replace(/[^a-z0-9]/g, "");
        if (!key) return "";
        const known: Record<string, string> = {
          netflix: "netflix.com",
          spotify: "spotify.com",
          youtube: "youtube.com",
          youtubepremium: "youtube.com",
          disney: "disneyplus.com",
          disneyplus: "disneyplus.com",
          nubank: "nubank.com.br",
          github: "github.com",
          hbo: "hbomax.com",
          hbomax: "hbomax.com",
          primevideo: "primevideo.com",
          prime: "primevideo.com",
          openai: "openai.com",
          chatgpt: "openai.com",
          google: "google.com",
          apple: "apple.com",
          microsoft: "microsoft.com",
          adobe: "adobe.com",
          slack: "slack.com",
          notion: "notion.so",
          figma: "figma.com",
          dropbox: "dropbox.com",
          twitch: "twitch.tv",
          linkedin: "linkedin.com",
          twitter: "twitter.com",
          x: "x.com",
          instagram: "instagram.com",
          facebook: "facebook.com",
          amazon: "amazon.com",
          paramount: "paramountplus.com",
          paramountplus: "paramountplus.com",
        };
        if (known[key]) return known[key];
        if (known[value]) return known[value];
        return `${key}.com`;
      };

      const buildDomainCandidates = async () => {
        const inferred = [
          inferDomain(normalized),
          inferDomain(compact),
          inferDomain(words.join("")),
        ].filter(Boolean);
        const domainSet = new Set<string>(inferred);

        try {
          const suggestRes = await fetch(
            `https://autocomplete.clearbit.com/v1/companies/suggest?query=${encodeURIComponent(query)}`,
            { signal: abort.signal },
          );
          if (suggestRes.ok) {
            const companies = (await suggestRes.json()) as Array<{
              domain?: string | null;
            }>;
            (companies || []).forEach((company) => {
              const domain = (company?.domain || "").trim().toLowerCase();
              if (domain) domainSet.add(domain);
            });
          }
        } catch (_) {
          // Logo URL extraction is best-effort; ignore failures
        }

        const results = domainSet.size === 0 && compact
          ? [`${compact}.com`, `${compact}.com.br`]
          : Array.from(domainSet).slice(0, 10);

        return results;
      };

      const domainSources = [
        (d: string) => `https://logo.clearbit.com/${encodeURIComponent(d)}`,
        (d: string) =>
          `https://cdn.brandfetch.io/${encodeURIComponent(d)}/w/512/h/512`,
        (d: string) =>
          `https://unavatar.io/${encodeURIComponent(d)}?fallback=false`,
        (d: string) =>
          `https://img.logo.dev/${encodeURIComponent(d)}?format=png`,
        (d: string) => `https://icon.horse/icon/${encodeURIComponent(d)}`,
      ];

      const domains = await buildDomainCandidates();

      const slugCandidates = Array.from(
        new Set([
          ...(aliasMap[normalized] || []),
          compact,
          words.join(""),
          words.join("-"),
          ...words,
        ]),
      )
        .filter((s) => s.length >= 2)
        .slice(0, 8);

      type Candidate = { url: string; key: string };
      const allCandidates: Candidate[] = [];
      for (const domain of domains) {
        for (const src of domainSources) {
          allCandidates.push({ url: src(domain), key: domain });
        }
      }
      for (const slug of slugCandidates) {
        allCandidates.push({
          url: `https://cdn.simpleicons.org/${encodeURIComponent(slug)}`,
          key: slug,
        });
      }

      const seen = new Set<string>();
      const unique = allCandidates.filter(({ url }) => {
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      });

      const BATCH = 8;
      const results: LogoResult[] = [];

      for (let i = 0; i < unique.length; i += BATCH) {
        if (cancelled) break;
        const batch = unique.slice(i, i + BATCH);
        const settled = await Promise.allSettled(
          batch.map(({ url, key }) => probeImage(url, key)),
        );
        for (const r of settled) {
          if (r.status === "fulfilled" && r.value) results.push(r.value);
        }
        if (results.length >= 15) break;
      }

      if (results.length < 3) {
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(query)}&background=random&color=fff&format=png&bold=true&rounded=true&length=1&size=256`;
        const candidate = await probeImage(fallbackUrl, compact || "logo");
        if (candidate) results.push(candidate);
      }

      const sorted = results.sort((a, b) => {
        const priority = (type: string) => {
          if (type.includes("png")) return 0;
          if (type.includes("svg")) return 1;
          if (type.includes("jpeg") || type.includes("jpg")) return 2;
          if (type.includes("webp")) return 3;
          return 4;
        };
        return priority(a.contentType) - priority(b.contentType);
      });

      if (cancelled) {
        sorted.forEach((logo) => URL.revokeObjectURL(logo.previewUrl));
        return;
      }

      setLogoResults(sorted.slice(0, 15));
    };

    const timeoutId = window.setTimeout(() => {
      void collectLogos().finally(() => {
        if (!cancelled) setSearching(false);
      });
    }, 350);

    return () => {
      cancelled = true;
      abort.abort();
      window.clearTimeout(timeoutId);
    };
  }, [logoSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        logoSearchRef.current &&
        !logoSearchRef.current.contains(event.target as Node)
      ) {
        setShowLogoResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      logoResults.forEach((item) => {
        if (logoPreview && item.previewUrl === logoPreview) return;
        URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [logoResults, logoPreview]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const handleSelectLogo = (result: LogoResult) => {
    if (logoPreview && logoPreview !== result.previewUrl) {
      URL.revokeObjectURL(logoPreview);
    }
    setLogoFile(result.file);
    setLogoPreview(result.previewUrl);
    setLogoUrl(result.source);
    setShowLogoResults(false);
  };

  // ── Submit ───────────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormValues) => {
    try {
      const body: Record<string, unknown> = {
        name: data.name,
        price: data.price,
        currency: data.currency,
        frequency: parseInt(data.frequency),
        cycle: data.cycle,
        next_payment: data.next_payment,
        start_date: data.start_date,
        payment_method: data.payment_method || null,
        payer: data.payer || null,
        category: data.category || null,
        notes: data.notes,
        url: data.url,
        auto_renew: data.auto_renew,
        notify: data.notify,
        notify_days_before: parseInt(data.notify_days_before),
        inactive: data.inactive,
        auto_mark_paid: data.auto_mark_paid,
        cancellation_date: data.cancellation_date || null,
        user: userId,
      };

      let result: Subscription;
      let logoToUpload: File | null = logoFile;

      if (!logoToUpload && logoUrl) {
        try {
          const direct = await fetch(logoUrl);
          if (!direct.ok) throw new Error("logo_fetch_failed");
          const blob = await direct.blob();
          const extFromType = blob.type?.split("/")?.[1] || "png";
          logoToUpload = new File([blob], `logo.${extFromType}`, {
            type: blob.type || "image/png",
          });
        } catch {
          toast.error(t("error_fetching_image_results"));
          return;
        }
      }

      if (logoToUpload) {
        logoToUpload = await compressImage(logoToUpload, { maxSize: 256 });
        const formData = new FormData();
        Object.entries(body).forEach(([k, v]) => {
          if (v !== null && v !== undefined) formData.append(k, String(v));
        });
        formData.append("logo", logoToUpload);
        if (sub) {
          result = await subscriptionsService.update(sub.id, formData);
        } else {
          result = await subscriptionsService.create(formData);
        }
      } else {
        if (sub) {
          result = await subscriptionsService.update(sub.id, body);
        } else {
          result = await subscriptionsService.create(body);
        }
      }

      void result;
      toast.success(t("success"));
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("unknown_error");
      toast.error(msg);
    }
  };

  // ── Derive selected currency for CurrencyInput ───────────────────────────────
  const selectedCurrency = currencies.find((c) => c.id === watchedCurrency);

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {sub ? t("edit_subscription") : t("add_subscription")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>{t("name")} *</Label>
            <Input {...register("name")} />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Logo section */}
          <div className="space-y-3 rounded-lg border p-3">
            <Label className="text-sm font-medium">{t("logo")}</Label>
            <div className="flex gap-2 items-start">
              <div ref={logoSearchRef} className="relative flex-1">
                <Input
                  placeholder={t("search_logo") + "..."}
                  value={logoSearch}
                  onChange={(e) => setLogoSearch(e.target.value)}
                  onFocus={() => {
                    if (logoSearch.trim().length >= 2) setShowLogoResults(true);
                  }}
                />

                {showLogoResults && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-md border bg-popover shadow-md">
                    {searching ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {t("loading")}
                      </div>
                    ) : logoResults.length > 0 ? (
                      <div className="max-h-64 overflow-y-auto p-2">
                        <div className="grid grid-cols-3 gap-2">
                          {logoResults.map((result) => (
                            <button
                              key={result.source}
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => handleSelectLogo(result)}
                              className={`h-20 rounded border overflow-hidden bg-background p-2 ${
                                logoPreview === result.previewUrl
                                  ? "ring-2 ring-primary"
                                  : ""
                              }`}
                            >
                              <img
                                src={result.previewUrl}
                                alt=""
                                className="h-full w-full object-contain"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {t("no_logos_found")}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <label>
                <Button type="button" variant="outline" size="sm" asChild>
                  <span>
                    <Upload className="h-4 w-4 mr-1" />
                    {t("upload_avatar")}
                  </span>
                </Button>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0] ?? null;
                    if (logoPreview) URL.revokeObjectURL(logoPreview);
                    if (file) {
                      setLogoPreview(URL.createObjectURL(file));
                    } else {
                      setLogoPreview(null);
                    }
                    setLogoFile(file);
                    setLogoUrl("");
                    setShowLogoResults(false);
                  }}
                />
              </label>
            </div>

            {(logoPreview || logoUrl) && (
              <div className="h-14 w-20 overflow-hidden rounded border bg-muted p-2">
                <img
                  src={logoPreview || logoUrl}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
            )}

            {logoFile && (
              <p className="text-xs text-muted-foreground">
                {logoFile.name}
              </p>
            )}
          </div>

          {/* Price + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("price")} *</Label>
              <Controller
                name="price"
                control={control}
                render={({ field }) => (
                  <CurrencyInput
                    value={field.value}
                    onChange={field.onChange}
                    symbol={selectedCurrency?.symbol}
                    code={selectedCurrency?.code}
                  />
                )}
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("currency")}</Label>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.symbol} {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.currency && (
                <p className="text-sm text-destructive">{errors.currency.message}</p>
              )}
            </div>
          </div>

          {/* Frequency + Cycle */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("frequency")}</Label>
              <Input type="number" min="1" {...register("frequency")} />
              {errors.frequency && (
                <p className="text-sm text-destructive">{errors.frequency.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("cycle")}</Label>
              <Controller
                name="cycle"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {cycles.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.cycle && (
                <p className="text-sm text-destructive">{errors.cycle.message}</p>
              )}
            </div>
          </div>

          {/* Next payment + Start date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("next_payment")}</Label>
              <Input type="date" {...register("next_payment")} />
              {errors.next_payment && (
                <p className="text-sm text-destructive">{errors.next_payment.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("start_date")}</Label>
              <Input type="date" {...register("start_date")} />
            </div>
          </div>

          {/* Category + Payer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("category")}</Label>
              <Controller
                name="category"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("optional")} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("payer")}</Label>
              <Controller
                name="payer"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("optional")} />
                    </SelectTrigger>
                    <SelectContent>
                      {household.map((h) => (
                        <SelectItem key={h.id} value={h.id}>
                          {h.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label>{t("payment_method")}</Label>
            <Controller
              name="payment_method"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder={t("optional")} />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* URL + Notes */}
          <div className="space-y-2">
            <Label>{t("url")}</Label>
            <Input type="url" {...register("url")} placeholder="https://..." />
          </div>
          <div className="space-y-2">
            <Label>{t("notes")}</Label>
            <Textarea {...register("notes")} rows={2} />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label>{t("auto_renew")}</Label>
              <Controller
                name="auto_renew"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("notify")}</Label>
              <Controller
                name="notify"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("inactive")}</Label>
              <Controller
                name="inactive"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                )}
              />
            </div>
            {!!authUser?.payment_tracking && (
              <div className="flex items-center justify-between">
                <Label>{t("auto_mark_paid")}</Label>
                <Controller
                  name="auto_mark_paid"
                  control={control}
                  render={({ field }) => (
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  )}
                />
              </div>
            )}
          </div>

          {watchedNotify && (
            <div className="space-y-2">
              <Label>{t("notify_days_before")}</Label>
              <Input type="number" min="0" {...register("notify_days_before")} />
            </div>
          )}

          {watchedInactive && (
            <div className="space-y-2">
              <Label>{t("cancellation_date")}</Label>
              <Input type="date" {...register("cancellation_date")} />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? t("loading") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
