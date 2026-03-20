import { useEffect } from "react";
import { useTranslation } from "react-i18next";

function setMeta(selector: string, attr: "content", value: string) {
  const el = document.head.querySelector<HTMLMetaElement>(selector);
  if (el) {
    el.setAttribute(attr, value);
    return;
  }

  const meta = document.createElement("meta");

  if (selector.startsWith('meta[name="')) {
    const name = selector.slice(11, -2);
    meta.setAttribute("name", name);
  } else if (selector.startsWith('meta[property="')) {
    const property = selector.slice(15, -2);
    meta.setAttribute("property", property);
  }

  meta.setAttribute(attr, value);
  document.head.appendChild(meta);
}

export function AppMetadata() {
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const appName = t("app_name", { defaultValue: "Zublo" });
    const subtitle = t("meta_subtitle", {
      defaultValue: "Self-hosted subscription tracking with AI that is actually useful.",
    });
    const description = t("meta_description", {
      defaultValue:
        "Track recurring payments, manage subscriptions, and use built-in AI workflows with a self-hosted Docker-first app.",
    });

    document.documentElement.lang = i18n.resolvedLanguage ?? i18n.language ?? "en";
    document.title = `${appName} — ${subtitle}`;

    setMeta('meta[name="application-name"]', "content", appName);
    setMeta('meta[name="apple-mobile-web-app-title"]', "content", appName);
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", appName);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[name="twitter:title"]', "content", appName);
    setMeta('meta[name="twitter:description"]', "content", description);
  }, [i18n.language, i18n.resolvedLanguage, t]);

  return null;
}
