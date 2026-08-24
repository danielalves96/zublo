const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const backendRoot = path.join(__dirname, "../..");

describe("fixer settings API-key security", () => {
  it("restores writes with a forward migration and repairs configured flags", () => {
    const migrationSource = fs.readFileSync(
      path.join(
        backendRoot,
        "pb_migrations/0022_restore_settings_api_key_writes.js",
      ),
      "utf8",
    );
    let up;
    let down;
    vm.runInNewContext(migrationSource, {
      migrate(upCallback, downCallback) {
        up = upCallback;
        down = downCallback;
      },
    });

    const apiKeyField = { hidden: true, name: "api_key" };
    const collection = {
      createRule: "@request.auth.id != ''",
      fields: [apiKeyField, { hidden: false, name: "provider" }],
    };
    const configuredRecord = fakeRecord("  saved-secret  ", false);
    const emptyRecord = fakeRecord("   ", true);
    const saved = [];
    const app = {
      findCollectionByNameOrId(name) {
        expect(name).toBe("fixer_settings");
        return collection;
      },
      findRecordsByFilter(name, filter, sort, limit, offset) {
        expect([name, filter, sort, limit, offset]).toEqual([
          "fixer_settings",
          "1=1",
          "",
          0,
          0,
        ]);
        return [configuredRecord, emptyRecord];
      },
      save(value) {
        saved.push(value);
      },
    };

    up(app);

    expect(apiKeyField.hidden).toBe(false);
    expect(collection.createRule).toBe(
      "@request.auth.id != '' && @request.body.user = @request.auth.id",
    );
    expect(configuredRecord.get("api_key_configured")).toBe(true);
    expect(emptyRecord.get("api_key_configured")).toBe(false);
    expect(saved).toEqual([collection, configuredRecord, emptyRecord]);

    down(app);

    expect(apiKeyField.hidden).toBe(true);
    expect(collection.createRule).toBe("@request.auth.id != ''");
    expect(saved.at(-1)).toBe(collection);
  });

  it("hides secrets after enrichment and derives configured state on writes", () => {
    const hookSource = fs.readFileSync(
      path.join(backendRoot, "pb_hooks/security.pb.js"),
      "utf8",
    );
    const callbacks = {};
    const tags = {};
    const register =
      (name) =>
      (callback, ...collectionTags) => {
        callbacks[name] = callback;
        tags[name] = collectionTags;
      };

    vm.runInNewContext(hookSource, {
      onRecordCreateRequest: register("create"),
      onRecordEnrich: register("enrich"),
      onRecordUpdateRequest: register("update"),
    });

    expect(tags).toEqual({
      create: ["ai_settings", "fixer_settings"],
      enrich: ["ai_settings", "fixer_settings"],
      update: ["ai_settings", "fixer_settings"],
    });

    const order = [];
    callbacks.enrich({
      next() {
        order.push("next");
      },
      record: {
        hide(name) {
          order.push(`hide:${name}`);
        },
      },
    });
    expect(order).toEqual(["next", "hide:api_key"]);

    const created = fakeRecord(" new-key ", false);
    callbacks.create({ next() {}, record: created });
    expect(created.get("api_key_configured")).toBe(true);

    const updated = fakeRecord("", true);
    callbacks.update({ next() {}, record: updated });
    expect(updated.get("api_key_configured")).toBe(false);
  });
});

function fakeRecord(apiKey, configured) {
  const values = new Map([
    ["api_key", apiKey],
    ["api_key_configured", configured],
  ]);

  return {
    get(name) {
      return values.get(name);
    },
    set(name, value) {
      values.set(name, value);
    },
  };
}
