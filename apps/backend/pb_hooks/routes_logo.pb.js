/// <reference path="../pb_data/types.d.ts" />

// NOTE: In PocketBase JSVM (Goja), file-scope helper bindings are not
// reliably available inside router callbacks. Require helpers inside
// each callback so the runtime can always resolve them at request time.

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

// ================================================================
// ROUTE: Logo Search
// ================================================================
routerAdd("GET", "/api/logo_search", (e) => {
  const logoUtils = require(__hooks + "/lib/pure/logo-utils.js");
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
        logos = logoUtils.extractImageUrlsFromPage(res.raw, maxResults);
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
          logos = logoUtils.extractImageUrlsFromPage(res.raw, maxResults);
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
