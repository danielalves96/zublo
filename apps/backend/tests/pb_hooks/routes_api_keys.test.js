const fs = require("node:fs");
const path = require("node:path");

const { HOOKS_DIR, fileScopeBindings, skipToMatchingBrace } = require("./helpers/hook-source.js");

const SOURCE = fs.readFileSync(path.join(HOOKS_DIR, "routes_api_keys.pb.js"), "utf8");

/**
 * PocketBase runs each router callback on a pooled Goja runtime that never
 * evaluated the file it was written in, so a handler only ever sees its own
 * arguments and whatever it require()s itself. These helpers rebuild that
 * isolation: every handler is extracted from the source and compiled on its
 * own, with no access to anything declared at file scope.
 */
function extractHandlers(source) {
  const handlers = [];
  const registration = /^routerAdd\(\s*"([^"]+)"\s*,\s*"([^"]+)"/gm;
  let call;

  while ((call = registration.exec(source)) !== null) {
    const open = source.indexOf("(", call.index);
    const argsEnd = skipToMatchingBrace(source, open);
    const args = source.slice(open, argsEnd);
    const handlerStart = args.search(/function\b|\([^)]*\)\s*=>/);

    handlers.push({
      method: call[1],
      route: call[2],
      source: args.slice(handlerStart).trim(),
    });

    registration.lastIndex = argsEnd;
  }

  return handlers;
}

function compileInIsolation(handler) {
  // Only the bindings PocketBase itself injects are in scope — nothing else.
  return new Function(
    "require",
    "__hooks",
    "$app",
    "$security",
    "return (" + handler.source + ");",
  )(require, HOOKS_DIR, undefined, undefined);
}

function mockEvent() {
  const responses = [];
  return {
    responses,
    auth: null,
    request: {
      header: { get: () => "" },
      url: { query: () => ({ get: () => "" }) },
    },
    requestInfo: () => ({ body: {} }),
    json: (status, body) => {
      responses.push({ status, body });
      return { status, body };
    },
  };
}

const handlers = extractHandlers(SOURCE);

describe("pb_hooks/routes_api_keys.pb.js", () => {
  it("registers every route the external API documents", () => {
    expect(handlers).toHaveLength(32);
    expect(handlers.filter((h) => h.route.startsWith("/api/external/"))).toHaveLength(28);
  });

  it("declares no file-scope bindings, which a pooled runtime would not have", () => {
    expect(fileScopeBindings(SOURCE)).toEqual([]);
  });

  it.each(handlers.map((handler) => [handler.method + " " + handler.route, handler]))(
    "%s resolves its helpers without reaching outside the callback",
    (_name, handler) => {
      const e = mockEvent();

      // Unauthenticated and unkeyed, so every handler should reject early —
      // but only after running the header parsing that used to crash.
      expect(() => compileInIsolation(handler)(e)).not.toThrow();
      expect(e.responses[0].status).toBe(401);
    },
  );
});
