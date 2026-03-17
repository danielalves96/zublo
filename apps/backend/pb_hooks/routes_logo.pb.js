/// <reference path="../pb_data/types.d.ts" />

function getQueryParam(e, key) {
  let value = "";
  try {
    value = e.request.url.query().get(key) || "";
  } catch (_) { }
  if (!value) {
    try {
      value = e.requestInfo().query[key] || "";
    } catch (_) { }
  }
  return String(value || "").trim();
}

function extractImageUrlsFromPage(html, limit) {
  const imageUrls = [];
  const seen = {};

  const addUrl = (url) => {
    if (!url || seen[url] || imageUrls.length >= limit) return;
    seen[url] = true;
    imageUrls.push(url);
  };

  const imgTagRegex = /<img\b[^>]*>/gi;
  const srcRegex = /\bsrc=["']([^"']+)["']/i;
  const classRegex = /\bclass=["']([^"']+)["']/i;
  const shouldSkipUrl = (src, cls) => {
    const lower = src.toLowerCase();
    if (cls.includes("favicon")) return true;
    if (lower.startsWith("data:")) return true;
    if (!/^https?:\/\//i.test(lower) && !lower.startsWith("//")) return true;
    if (lower.includes("google.com/s2/favicons")) return true;
    if (lower.includes("ssl.gstatic.com/gb/images")) return true;
    if (lower.includes("favicons.search.brave.com")) return true;
    if (lower.includes("brave-logo")) return true;
    if (lower.includes("/rs:fit:16:") || lower.includes("/rs:fit:24:") || lower.includes("/rs:fit:32:")) return true;
    if (lower.includes("wikipedia.org/wiki/") || lower.includes("wikimedia.org/wiki/")) return true;

    try {
      const normalized = lower.startsWith("//") ? "https:" + lower : lower;
      const u = new URL(normalized);
      const path = u.pathname || "";
      const hasImageExt = /\.(png|jpg|jpeg|webp|svg|gif|ico)$/i.test(path);
      const isGoogleThumb = normalized.includes("encrypted-tbn0.gstatic.com/images?q=tbn:");
      const isBraveImgProxy = normalized.includes("imgs.search.brave.com/");
      if (!hasImageExt && !isGoogleThumb && !isBraveImgProxy) return true;
    } catch (_) {
      return true;
    }

    return false;
  };

  let imgMatch;
  while ((imgMatch = imgTagRegex.exec(html)) !== null && imageUrls.length < limit) {
    const tag = imgMatch[0];
    const srcMatch = srcRegex.exec(tag);
    if (!srcMatch) continue;
    const cls = (classRegex.exec(tag)?.[1] || "").toLowerCase();
    let src = srcMatch[1] || "";
    if (!src || shouldSkipUrl(src, cls)) continue;
    if (src.startsWith("//")) src = "https:" + src;
    addUrl(src);
  }

  if (imageUrls.length < limit) {
    const fallbackPatterns = [
      /https?:\/\/encrypted-tbn0\.gstatic\.com\/images\?q=tbn:[^\s"'<>]+/gi,
      /https?:\/\/imgs\.search\.brave\.com\/[^\s"'<>]+/gi,
      /https?:\/\/[^\s"'<>]+\.(?:png|jpg|jpeg|webp|svg)(?:\?[^\s"'<>]*)?/gi,
    ];

    for (const pattern of fallbackPatterns) {
      let m;
      while ((m = pattern.exec(html)) !== null && imageUrls.length < limit) {
        const url = String(m[0] || "").replace(/&amp;/g, "&");
        if (!url) continue;
        const lower = url.toLowerCase();
        if (lower.includes("favicons.search.brave.com")) continue;
        if (lower.includes("brave-logo")) continue;
        if (lower.includes("ssl.gstatic.com/gb/images")) continue;
        if (lower.includes("wikipedia.org/wiki/") || lower.includes("wikimedia.org/wiki/")) continue;

        try {
          const u = new URL(url);
          const path = u.pathname || "";
          const hasImageExt = /\.(png|jpg|jpeg|webp|svg|gif|ico)$/i.test(path);
          const isGoogleThumb = lower.includes("encrypted-tbn0.gstatic.com/images?q=tbn:");
          const isBraveImgProxy = lower.includes("imgs.search.brave.com/");
          if (!hasImageExt && !isGoogleThumb && !isBraveImgProxy) continue;
        } catch (_) {
          continue;
        }

        addUrl(url);
      }
    }
  }

  return imageUrls;
}

// ================================================================
// ROUTE: Logo Search
// ================================================================
routerAdd("GET", "/api/logo_search", (e) => {
  try {
    if (!e.auth) {
      return e.json(403, { error: "Authentication required" });
    }

    const search = getQueryParam(e, "search");
    if (!search) {
      return e.json(400, { error: "Missing 'search' parameter" });
    }

    const encodedQuery = encodeURIComponent(search + " logo");
    const maxResults = 24;
    let logos = [];

    const googleUrl = "https://www.google.com/search?q=" + encodedQuery + "&tbm=isch";
    const braveUrl = "https://search.brave.com/search?q=" + encodedQuery;

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Encoding": "identity",
    };

    try {
      const res = $http.send({
        url: googleUrl,
        method: "GET",
        headers,
      });

      if (res.statusCode === 200 && res.raw) {
        logos = extractImageUrlsFromPage(res.raw, maxResults);
      }
    } catch (_) { }

    if (logos.length === 0) {
      try {
        const res = $http.send({
          url: "https://search.brave.com/images?q=" + encodedQuery + "&source=web",
          method: "GET",
          headers,
        });

        if (res.statusCode === 200 && res.raw) {
          logos = extractImageUrlsFromPage(res.raw, maxResults);
        }
      } catch (_) { }
    }

    return e.json(200, { logos: logos });
  } catch (_) {
    return e.json(200, { logos: [] });
  }
});

routerAdd("GET", "/api/logo_fetch", (e) => {
  try {
    if (!e.auth) {
      return e.json(403, { error: "Authentication required" });
    }

    const url = getQueryParam(e, "url");

    if (!url || !/^https?:\/\//i.test(url)) {
      return e.json(400, { error: "Invalid 'url' parameter" });
    }

    const lowerUrl = url.toLowerCase();
    if (
      lowerUrl.includes("localhost") ||
      lowerUrl.includes("127.0.0.1") ||
      lowerUrl.includes("0.0.0.0") ||
      lowerUrl.includes("::1")
    ) {
      return e.json(400, { error: "Blocked host" });
    }

    const res = $http.send({
      url,
      method: "GET",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; Zublo/1.0)",
        "Accept": "image/*,*/*;q=0.8",
      },
    });

    if (res.statusCode !== 200 || !res.raw) {
      return e.json(400, { error: "Unable to fetch image" });
    }

    let contentType = "image/png";
    try {
      const ct = res.headers?.["Content-Type"] || res.headers?.["content-type"];
      if (ct) contentType = String(ct).split(";")[0];
    } catch (_) { }

    const base64 = btoa(res.raw);
    return e.json(200, { contentType, base64 });
  } catch (err) {
    return e.json(400, { error: "Failed to fetch image", details: String(err) });
  }
});
