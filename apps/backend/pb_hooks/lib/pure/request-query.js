/**
 * Reads a single query-string parameter off a PocketBase request event.
 *
 * PocketBase exposes the query twice and the two are not always both
 * usable, so the parsed URL is tried first and requestInfo() is used as a
 * fallback. Either accessor can throw depending on how the request was
 * built, so both are guarded and a missing parameter simply reads as "".
 */
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

module.exports = { getQueryParam };
