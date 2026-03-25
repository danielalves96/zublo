function extractImageUrlsFromPage(html, limit) {
  const imageUrls = [];
  const seen = {};

  const addUrl = function (url) {
    if (!url || seen[url] || imageUrls.length >= limit) return;
    seen[url] = true;
    imageUrls.push(url);
  };

  const imgTagRegex = /<img\b[^>]*>/gi;
  const srcRegex = /\bsrc=["']([^"']+)["']/i;
  const classRegex = /\bclass=["']([^"']+)["']/i;

  const shouldSkipUrl = function (src, className) {
    const lower = src.toLowerCase();
    if (className.includes("favicon")) return true;
    if (lower.includes("favicon")) return true;
    if (lower.startsWith("data:")) return true;
    if (!/^https?:\/\//i.test(lower) && !lower.startsWith("//")) return true;
    /* v8 ignore next -- "google.com/s2/favicons" always contains "favicon"; caught by line above */
    if (lower.includes("google.com/s2/favicons")) return true;
    if (lower.includes("ssl.gstatic.com/gb/images")) return true;
    /* v8 ignore next -- "favicons.search.brave.com" always contains "favicon"; caught by line above */
    if (lower.includes("favicons.search.brave.com")) return true;
    if (lower.includes("brave-logo")) return true;
    if (lower.includes("/rs:fit:16:") || lower.includes("/rs:fit:24:") || lower.includes("/rs:fit:32:")) return true;
    if (lower.includes("wikipedia.org/wiki/") || lower.includes("wikimedia.org/wiki/")) return true;

    try {
      const normalized = lower.startsWith("//") ? "https:" + lower : lower;
      const parsed = new URL(normalized);
      /* v8 ignore next -- pathname is always a non-empty string when URL parsing succeeds */
      const path = parsed.pathname || "";
      const hasImageExtension = /\.(png|jpg|jpeg|webp|svg|gif|ico)$/i.test(path);
      const isGoogleThumb = normalized.includes("encrypted-tbn0.gstatic.com/images?q=tbn:");
      const isBraveProxy = normalized.includes("imgs.search.brave.com/");
      if (!hasImageExtension && !isGoogleThumb && !isBraveProxy) return true;
    } catch (_) {
      return true;
    }

    return false;
  };

  let imageMatch;
  while ((imageMatch = imgTagRegex.exec(html)) !== null && imageUrls.length < limit) {
    const tag = imageMatch[0];
    const srcMatch = srcRegex.exec(tag);
    if (!srcMatch) continue;
    const className = (classRegex.exec(tag) && classRegex.exec(tag)[1] || "").toLowerCase();
    /* v8 ignore next -- srcMatch[1] capture group requires [^"']+ so is never empty */
    let src = srcMatch[1] || "";
    if (!src || shouldSkipUrl(src, className)) continue;
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
      let match;
      while ((match = pattern.exec(html)) !== null && imageUrls.length < limit) {
        /* v8 ignore next -- match[0] is always truthy when exec() returns non-null */
        const url = String(match[0] || "").replace(/&amp;/g, "&");
        /* v8 ignore next -- url can never be empty here */
        if (!url) continue;
        const lower = url.toLowerCase();
        if (lower.includes("favicon")) continue;
        /* v8 ignore next -- "favicons.search.brave.com" always contains "favicon"; caught above */
        if (lower.includes("favicons.search.brave.com")) continue;
        if (lower.includes("brave-logo")) continue;
        if (lower.includes("ssl.gstatic.com/gb/images")) continue;
        if (lower.includes("wikipedia.org/wiki/") || lower.includes("wikimedia.org/wiki/")) continue;
        if (lower.includes("/rs:fit:16:") || lower.includes("/rs:fit:24:") || lower.includes("/rs:fit:32:")) continue;

        try {
          const parsed = new URL(url);
          /* v8 ignore next -- pathname is always a non-empty string when URL parsing succeeds */
          const path = parsed.pathname || "";
          const hasImageExtension = /\.(png|jpg|jpeg|webp|svg|gif|ico)$/i.test(path);
          const isGoogleThumb = lower.includes("encrypted-tbn0.gstatic.com/images?q=tbn:");
          const isBraveProxy = lower.includes("imgs.search.brave.com/");
          /* v8 ignore next -- pattern 3 only matches URLs with image extensions; this continue is unreachable */
          if (!hasImageExtension && !isGoogleThumb && !isBraveProxy) continue;
        } catch (_) {
          continue;
        }

        addUrl(url);
      }
    }
  }

  return imageUrls;
}

module.exports = {
  extractImageUrlsFromPage,
};
