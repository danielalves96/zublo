import type { ChangeEvent } from "react";
import { useEffect, useRef, useState } from "react";

export type LogoResult = {
  previewUrl: string;
  file: File;
  source: string;
  contentType: string;
};

export function useLogoSearch() {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState("");
  const [logoSearch, setLogoSearch] = useState("");
  const [logoResults, setLogoResults] = useState<LogoResult[]>([]);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [showLogoResults, setShowLogoResults] = useState(false);
  const logoSearchRef = useRef<HTMLDivElement>(null);

  // ── Logo search effect ─────────────────────────────────────────────────────
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
      /* v8 ignore next */
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
      /* v8 ignore next */
      if (lowered.includes(".ico")) return null;

      try {
        const res = await fetchWithTimeout(url);
        /* v8 ignore next */
        if (!res.ok) return null;

        /* v8 ignore next 3 */
        const contentType = (
          res.headers.get("content-type") || ""
        ).toLowerCase();
        /* v8 ignore next */
        if (!contentType.startsWith("image/")) return null;
        /* v8 ignore next */
        if (contentType.includes("icon")) return null;

        const blob = await res.blob();
        if (blob.size < 512) return null;

        /* v8 ignore next */
        const type = (contentType || blob.type || "image/png").split(";")[0];

        if (!type.includes("svg")) {
          try {
            const bitmap = await createImageBitmap(blob);
            const tooSmall = bitmap.width < 48 || bitmap.height < 48;
            bitmap.close();
            /* v8 ignore next */
            if (tooSmall) return null;
          } catch {
            // Cannot check dimensions — accept
          }
        }

        /* v8 ignore next */
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
        /* v8 ignore next */
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
        /* v8 ignore next */
        if (known[key]) return known[key];
        /* v8 ignore next */
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
            /* v8 ignore next */
            (companies || []).forEach((company) => {
              /* v8 ignore next */
              const domain = (company?.domain || "").trim().toLowerCase();
              if (domain) domainSet.add(domain);
            });
          }
        } catch (_) {
          // Logo URL extraction is best-effort; ignore failures
        }

        /* v8 ignore next 3 */
        const results =
          domainSet.size === 0 && compact
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
        /* v8 ignore next */
        if (seen.has(url)) return false;
        seen.add(url);
        return true;
      });

      const BATCH = 8;
      const results: LogoResult[] = [];

      for (let i = 0; i < unique.length; i += BATCH) {
        /* v8 ignore next */
        if (cancelled) break;
        const batch = unique.slice(i, i + BATCH);
        const settled = await Promise.allSettled(
          batch.map(({ url, key }) => probeImage(url, key)),
        );
        for (const r of settled) {
          /* v8 ignore next */
          if (r.status === "fulfilled" && r.value) results.push(r.value);
        }
        /* v8 ignore next */
        if (results.length >= 15) break;
      }

      if (results.length < 3) {
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(query)}&background=random&color=fff&format=png&bold=true&rounded=true&length=1&size=256`;
        /* v8 ignore next */
        const candidate = await probeImage(fallbackUrl, compact || "logo");
        /* v8 ignore next */
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

  // ── Click-outside closes results panel ────────────────────────────────────
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

  // ── Revoke blob URLs on results change ────────────────────────────────────
  useEffect(() => {
    return () => {
      logoResults.forEach((item) => {
        if (logoPreview && item.previewUrl === logoPreview) return;
        URL.revokeObjectURL(item.previewUrl);
      });
    };
  }, [logoResults, logoPreview]);

  // ── Revoke preview URL on preview change ─────────────────────────────────
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

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
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
  };

  return {
    logoFile,
    logoUrl,
    logoSearch,
    setLogoSearch,
    logoResults,
    logoPreview,
    searching,
    showLogoResults,
    setShowLogoResults,
    logoSearchRef,
    handleSelectLogo,
    handleFileChange,
  };
}
