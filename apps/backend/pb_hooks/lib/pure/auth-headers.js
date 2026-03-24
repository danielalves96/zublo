function extractBearerToken(headerValue) {
  return String(headerValue || "").replace(/^Bearer\s+/i, "").trim();
}

module.exports = {
  extractBearerToken,
};
