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
    if (lower.includes("google.com/s2/favicons")) return true;
    if (lower.includes("ssl.gstatic.com/gb/images")) return true;
    if (lower.includes("favicons.search.brave.com")) return true;
    if (lower.includes("brave-logo")) return true;
    if (lower.includes("/rs:fit:16:") || lower.includes("/rs:fit:24:") || lower.includes("/rs:fit:32:")) return true;
    if (lower.includes("wikipedia.org/wiki/") || lower.includes("wikimedia.org/wiki/")) return true;

    try {
      const normalized = lower.startsWith("//") ? "https:" + lower : lower;
      const parsed = new URL(normalized);
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
        const url = String(match[0] || "").replace(/&amp;/g, "&");
        if (!url) continue;
        const lower = url.toLowerCase();
        if (lower.includes("favicon")) continue;
        if (lower.includes("favicons.search.brave.com")) continue;
        if (lower.includes("brave-logo")) continue;
        if (lower.includes("ssl.gstatic.com/gb/images")) continue;
        if (lower.includes("wikipedia.org/wiki/") || lower.includes("wikimedia.org/wiki/")) continue;

        try {
          const parsed = new URL(url);
          const path = parsed.pathname || "";
          const hasImageExtension = /\.(png|jpg|jpeg|webp|svg|gif|ico)$/i.test(path);
          const isGoogleThumb = lower.includes("encrypted-tbn0.gstatic.com/images?q=tbn:");
          const isBraveProxy = lower.includes("imgs.search.brave.com/");
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
