/// <reference path="../pb_data/types.d.ts" />

// ================================================================
// ROUTE: Payment Methods Icon Search
// ================================================================
routerAdd("GET", "/api/payments/search", (e) => {
  if (!e.auth) throw new ForbiddenError("Authentication required");
  const search = e.request.url.query().get("search");

  if (!search) {
    return e.json(400, { error: "Missing 'search' parameter" });
  }

  // Search for payment brand icons via simple-icons CDN
  const icons = [];
  const query = search.toLowerCase().replace(/\s+/g, "");

  // Try simple-icons (most payment brands are there)
  try {
    const url = "https://cdn.simpleicons.org/" + query;
    const res = $http.send({ url: url, method: "HEAD" });
    if (res.statusCode === 200) {
      icons.push(url);
    }
  } catch (_) { }

  return e.json(200, { icons: icons });
});
