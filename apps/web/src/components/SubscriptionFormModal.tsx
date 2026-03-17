import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import pb from "@/lib/pb";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/lib/toast";
import { CurrencyInput } from "@/components/ui/currency-input";
import type {
  Subscription,
  Currency,
  Category,
  PaymentMethod,
  Household,
  Cycle,
} from "@/types";
import { useQuery } from "@tanstack/react-query";
import { Upload } from "lucide-react";

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

const DEFAULT_FORM = {
  name: "",
  price: "",
  currency: "",
  frequency: "1",
  cycle: "",
  next_payment: "",
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
  logo_url: "",
};

type LogoResult = {
  previewUrl: string;
  file: File;
  source: string;
  contentType: string;
};

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
  const [form, setForm] = useState({ ...DEFAULT_FORM });
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoSearch, setLogoSearch] = useState("");
  const [logoResults, setLogoResults] = useState<LogoResult[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [showLogoResults, setShowLogoResults] = useState(false);
  const logoSearchRef = useRef<HTMLDivElement>(null);

  const { data: cycles = [] } = useQuery({
    queryKey: ["cycles"],
    queryFn: () => pb.collection("cycles").getFullList<Cycle>(),
  });

  // Pre-fill form when editing
  useEffect(() => {
    if (sub) {
      setForm({
        name: sub.name,
        price: String(sub.price),
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
        logo_url: "",
      });
    } else {
      // Defaults for new subscription
      const mainCur = currencies.find((c) => c.is_main);
      const monthCycle = cycles.find((c) => c.name === "Monthly");
      setForm({
        ...DEFAULT_FORM,
        currency: mainCur?.id || currencies[0]?.id || "",
        cycle: monthCycle?.id || cycles[0]?.id || "",
        payer: household[0]?.id || "",
        next_payment: (() => {
          const d = new Date();
          d.setMonth(d.getMonth() + 1);
          return d.toISOString().split("T")[0];
        })(),
      });
    }
  }, [sub, currencies, cycles, household]);

  const setField = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

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

        // Check minimum dimensions (skip for SVG — vector, always fine)
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
        } catch (_) {}

        if (domainSet.size === 0 && compact) {
          domainSet.add(`${compact}.com`);
          domainSet.add(`${compact}.com.br`);
        }

        return Array.from(domainSet).slice(0, 10);
      };

      // Ordered by quality — no Google Favicons (too small/unreliable)
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

      // Build full candidate list (domain sources first, then SimpleIcons)
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

      // Deduplicate URLs
      const seen = new Set<string>();
      const unique = allCandidates.filter(({ url }) => {
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      });

      // Probe in parallel batches of 8
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

      // Guarantee at least 3 with ui-avatars fallback
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
    setField("logo_url", result.source);
    setShowLogoResults(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        price: parseFloat(form.price),
        currency: form.currency,
        frequency: parseInt(form.frequency),
        cycle: form.cycle,
        next_payment: form.next_payment,
        start_date: form.start_date,
        payment_method: form.payment_method || null,
        payer: form.payer || null,
        category: form.category || null,
        notes: form.notes,
        url: form.url,
        auto_renew: form.auto_renew,
        notify: form.notify,
        notify_days_before: parseInt(form.notify_days_before),
        inactive: form.inactive,
        auto_mark_paid: form.auto_mark_paid,
        cancellation_date: form.cancellation_date || null,
        user: userId,
      };

      let result: Subscription;
      let logoToUpload: File | null = logoFile;

      if (!logoToUpload && form.logo_url) {
        try {
          const direct = await fetch(form.logo_url);
          if (!direct.ok) throw new Error("logo_fetch_failed");
          const blob = await direct.blob();

          const extFromType = blob.type?.split("/")?.[1] || "png";
          logoToUpload = new File([blob], `logo.${extFromType}`, {
            type: blob.type || "image/png",
          });
        } catch {
          toast.error(t("error_fetching_image_results"));
          setLoading(false);
          return;
        }
      }

      if (logoToUpload) {
        const formData = new FormData();
        Object.entries(body).forEach(([k, v]) => {
          if (v !== null && v !== undefined) formData.append(k, String(v));
        });
        formData.append("logo", logoToUpload);
        if (sub) {
          result = await pb
            .collection("subscriptions")
            .update<Subscription>(sub.id, formData);
        } else {
          result = await pb
            .collection("subscriptions")
            .create<Subscription>(formData);
        }
      } else {
        if (sub) {
          result = await pb
            .collection("subscriptions")
            .update<Subscription>(sub.id, body);
        } else {
          result = await pb
            .collection("subscriptions")
            .create<Subscription>(body);
        }
      }

      void result; // suppress unused warning
      toast.success(t("success"));
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : t("unknown_error");
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {sub ? t("edit_subscription") : t("add_subscription")}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label>{t("name")} *</Label>
            <Input
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              required
            />
          </div>

          {/* Logo section (early in form) */}
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
                        Nenhum logo encontrado.
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
                    setField("logo_url", "");
                    setShowLogoResults(false);
                  }}
                />
              </label>
            </div>

            {(logoPreview || form.logo_url) && (
              <div className="h-14 w-20 overflow-hidden rounded border bg-muted p-2">
                <img
                  src={logoPreview || form.logo_url}
                  alt=""
                  className="h-full w-full object-contain"
                />
              </div>
            )}

            {logoFile && (
              <p className="text-xs text-muted-foreground">
                Selected: {logoFile.name}
              </p>
            )}
          </div>

          {/* Price + Currency */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("price")} *</Label>
              {(() => {
                const cur = currencies.find((c) => c.id === form.currency);
                return (
                  <CurrencyInput
                    value={form.price}
                    onChange={(v) => setField("price", String(v))}
                    symbol={cur?.symbol}
                    code={cur?.code}
                  />
                );
              })()}
            </div>
            <div className="space-y-2">
              <Label>{t("currency")}</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setField("currency", v)}
              >
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
            </div>
          </div>

          {/* Frequency + Cycle */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("frequency")}</Label>
              <Input
                type="number"
                min="1"
                value={form.frequency}
                onChange={(e) => setField("frequency", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("cycle")}</Label>
              <Select
                value={form.cycle}
                onValueChange={(v) => setField("cycle", v)}
              >
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
            </div>
          </div>

          {/* Next payment + Start date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("next_payment")}</Label>
              <Input
                type="date"
                value={form.next_payment}
                onChange={(e) => setField("next_payment", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("start_date")}</Label>
              <Input
                type="date"
                value={form.start_date}
                onChange={(e) => setField("start_date", e.target.value)}
              />
            </div>
          </div>

          {/* Category + Payer */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("category")}</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setField("category", v)}
              >
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
            </div>
            <div className="space-y-2">
              <Label>{t("payer")}</Label>
              <Select
                value={form.payer}
                onValueChange={(v) => setField("payer", v)}
              >
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
            </div>
          </div>

          {/* Payment method */}
          <div className="space-y-2">
            <Label>{t("payment_method")}</Label>
            <Select
              value={form.payment_method}
              onValueChange={(v) => setField("payment_method", v)}
            >
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
          </div>

          {/* URL + Notes */}
          <div className="space-y-2">
            <Label>{t("url")}</Label>
            <Input
              type="url"
              value={form.url}
              onChange={(e) => setField("url", e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2">
            <Label>{t("notes")}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={2}
            />
          </div>

          {/* Toggles */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between">
              <Label>{t("auto_renew")}</Label>
              <Switch
                checked={form.auto_renew}
                onCheckedChange={(v) => setField("auto_renew", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("notify")}</Label>
              <Switch
                checked={form.notify}
                onCheckedChange={(v) => setField("notify", v)}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>{t("inactive")}</Label>
              <Switch
                checked={form.inactive}
                onCheckedChange={(v) => setField("inactive", v)}
              />
            </div>
            {!!authUser?.payment_tracking && (
              <div className="flex items-center justify-between">
                <Label>{t("auto_mark_paid")}</Label>
                <Switch
                  checked={form.auto_mark_paid}
                  onCheckedChange={(v) => setField("auto_mark_paid", v)}
                />
              </div>
            )}
          </div>

          {form.notify && (
            <div className="space-y-2">
              <Label>{t("notify_days_before")}</Label>
              <Input
                type="number"
                min="0"
                value={form.notify_days_before}
                onChange={(e) => setField("notify_days_before", e.target.value)}
              />
            </div>
          )}

          {form.inactive && (
            <div className="space-y-2">
              <Label>{t("cancellation_date")}</Label>
              <Input
                type="date"
                value={form.cancellation_date}
                onChange={(e) => setField("cancellation_date", e.target.value)}
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? t("loading") : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
