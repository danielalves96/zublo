const { extractImageUrlsFromPage } = require("../../pb_hooks/lib/pure/logo-utils.js");

describe("pb_hooks/lib/pure/logo-utils.js", () => {
  it("extracts image URLs, upgrades protocol-relative URLs, and deduplicates", () => {
    const html = `
      <img src="https://cdn.example.com/logo.png" />
      <img src="//cdn.example.com/logo.png" />
      <img src="//cdn.example.com/logo.png" />
    `;

    expect(extractImageUrlsFromPage(html, 10)).toEqual(["https://cdn.example.com/logo.png"]);
  });

  it("filters favicon, data URLs, wikipedia pages, and non-image paths", () => {
    const html = `
      <img class="favicon" src="https://cdn.example.com/favicon.png" />
      <img src="data:image/png;base64,abc" />
      <img src="https://wikipedia.org/wiki/File:Logo" />
      <img src="https://cdn.example.com/not-an-image" />
      <img src="https://cdn.example.com/real.svg" />
    `;

    expect(extractImageUrlsFromPage(html, 10)).toEqual(["https://cdn.example.com/real.svg"]);
  });

  it("falls back to embedded URL detection and respects result limits", () => {
    const html = `
      https://imgs.search.brave.com/abc123
      https://encrypted-tbn0.gstatic.com/images?q=tbn:one
      https://cdn.example.com/logo-one.png
      https://cdn.example.com/logo-two.png
    `;

    expect(extractImageUrlsFromPage(html, 2)).toEqual([
      "https://encrypted-tbn0.gstatic.com/images?q=tbn:one",
      "https://imgs.search.brave.com/abc123",
    ]);
  });

  it("skips malformed URLs in both img tags and fallback text", () => {
    const html = `
      <img src="https://cdn.example.com:bad.png" />
      https://cdn.example.com:also-bad.png
      https://cdn.example.com/valid.png
    `;

    expect(extractImageUrlsFromPage(html, 10)).toEqual(["https://cdn.example.com/valid.png"]);
  });
});
