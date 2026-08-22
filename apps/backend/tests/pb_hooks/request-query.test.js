const { getQueryParam } = require("../../pb_hooks/lib/pure/request-query.js");

function event({ query, info } = {}) {
  return {
    request: {
      url: {
        query: () => {
          if (query instanceof Error) throw query;
          return { get: (key) => (query || {})[key] };
        },
      },
    },
    requestInfo: () => {
      if (info instanceof Error) throw info;
      return { query: info || {} };
    },
  };
}

describe("pb_hooks/lib/pure/request-query.js", () => {
  it("reads the parameter off the parsed url first", () => {
    expect(getQueryParam(event({ query: { search: "netflix" } }), "search")).toBe("netflix");
  });

  it("trims surrounding whitespace", () => {
    expect(getQueryParam(event({ query: { search: "  spotify  " } }), "search")).toBe("spotify");
  });

  it("falls back to requestInfo when the url carries no value", () => {
    const e = event({ query: { search: "" }, info: { search: "hulu" } });
    expect(getQueryParam(e, "search")).toBe("hulu");
  });

  it("falls back to requestInfo when reading the url throws", () => {
    const e = event({ query: new Error("no url"), info: { search: "disney" } });
    expect(getQueryParam(e, "search")).toBe("disney");
  });

  it("returns an empty string when both accessors throw", () => {
    const e = event({ query: new Error("no url"), info: new Error("no request info") });
    expect(getQueryParam(e, "search")).toBe("");
  });

  it("returns an empty string for a parameter neither source has", () => {
    expect(getQueryParam(event(), "search")).toBe("");
  });

  it("coerces non-string values", () => {
    expect(getQueryParam(event({ query: { page: 3 } }), "page")).toBe("3");
  });
});
