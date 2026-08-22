const {
  hookFiles,
  fileScopeBindings,
  callbackBodies,
  referencedIdentifiers,
} = require("./helpers/hook-source.js");

/**
 * Guards the whole pb_hooks directory against the failure that took down
 * every /api/external/* route: a callback reaching for a helper declared at
 * file scope, which the pooled runtime executing it has never seen.
 *
 * The check is static because the alternative — booting PocketBase — needs a
 * binary that is not checked in, and because the bug is invisible until a
 * request actually hits the route in production.
 */
const files = hookFiles();

describe("pb_hooks callback scope", () => {
  it("finds the hook files to check", () => {
    expect(files.length).toBeGreaterThan(10);
    expect(files.map((file) => file.name)).toContain("routes_api_keys.pb.js");
  });

  it.each(files.map((file) => [file.name, file]))(
    "%s never reads a file-scope binding from inside a callback",
    (_name, file) => {
      const bindings = fileScopeBindings(file.source);
      const leaks = [];

      for (const callback of callbackBodies(file.source)) {
        const referenced = referencedIdentifiers(callback.body);
        for (const binding of bindings) {
          if (referenced.has(binding)) {
            leaks.push(callback.registration + " reads " + binding);
          }
        }
      }

      expect(leaks).toEqual([]);
    },
  );

  it("only allows file-scope bindings that are consumed at registration time", () => {
    // PROTECTED_COLLECTIONS is spread into the hook tags, which PocketBase
    // evaluates while loading the file, so it is never read from a callback.
    const declared = files.flatMap((file) => (
      fileScopeBindings(file.source).map((name) => file.name + ":" + name)
    ));

    expect(declared).toEqual(["security.pb.js:PROTECTED_COLLECTIONS"]);
  });
});
