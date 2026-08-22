const settings = require("../../pb_hooks/lib/oidc-settings.js");

function settingsRecord(values = {}) {
  return {
    getBool: (key) => !!values[key],
    getString: (key) => String(values[key] ?? ""),
    getFloat: (key) => Number(values[key] ?? 0),
  };
}

beforeEach(() => {
  globalThis.$app = {
    findRecordsByFilter: vi.fn(() => []),
    countRecords: vi.fn(() => 0),
  };
  globalThis.$http = { send: vi.fn() };
  globalThis.__hooks = require("node:path").join(__dirname, "../../pb_hooks");
});

afterEach(() => {
  for (const key of ["$app", "$http", "__hooks"]) Reflect.deleteProperty(globalThis, key);
});

describe("pb_hooks/lib/oidc-settings.js", () => {
  it("expires a login state after ten minutes", () => {
    expect(settings.OIDC_STATE_TTL_MS).toBe(10 * 60 * 1000);
  });

  it("reads the singleton, including the access policy the signup form uses", () => {
    globalThis.$app.findRecordsByFilter = vi.fn(() => [settingsRecord({
      oidc_enabled: true,
      oidc_provider_name: "Authentik",
      oidc_client_id: "zublo",
      oidc_issuer_url: "https://id.example.com",
      open_registrations: true,
      max_users: 25,
      disable_login: false,
    })]);

    expect(settings.readOidcSettings()).toMatchObject({
      enabled: true,
      providerName: "Authentik",
      clientId: "zublo",
      issuerUrl: "https://id.example.com",
      openRegistrations: true,
      maxUsers: 25,
      disableLogin: false,
    });
  });

  it("returns null when the instance has no settings record", () => {
    expect(settings.readOidcSettings()).toBeNull();
  });

  it("returns null rather than throwing when the lookup fails", () => {
    globalThis.$app.findRecordsByFilter = vi.fn(() => { throw new Error("no table"); });
    expect(settings.readOidcSettings()).toBeNull();
  });

  it("counts users without materialising them", () => {
    globalThis.$app.countRecords = vi.fn(() => 7);
    expect(settings.countUsers()).toBe(7);
    expect(globalThis.$app.countRecords).toHaveBeenCalledWith("users");
  });

  it("resolves the provider endpoints from its discovery document", () => {
    globalThis.$http.send = vi.fn(() => ({
      statusCode: 200,
      json: {
        issuer: "https://id.example.com",
        authorization_endpoint: "https://id.example.com/authorize",
        token_endpoint: "https://id.example.com/token",
        userinfo_endpoint: "https://id.example.com/userinfo",
      },
    }));

    expect(settings.discoverOidcEndpoints("https://id.example.com")).toMatchObject({
      issuer: "https://id.example.com",
      authorizationEndpoint: "https://id.example.com/authorize",
      tokenEndpoint: "https://id.example.com/token",
    });
  });

  it("refuses a discovery document that is missing endpoints", () => {
    globalThis.$http.send = vi.fn(() => ({
      statusCode: 200,
      json: { issuer: "https://id.example.com" },
    }));

    expect(settings.discoverOidcEndpoints("https://id.example.com")).toBeNull();
  });

  it("refuses a discovery response that is not a usable document", () => {
    globalThis.$http.send = vi.fn(() => ({ statusCode: 404, json: null }));
    expect(settings.discoverOidcEndpoints("https://id.example.com")).toBeNull();

    globalThis.$http.send = vi.fn(() => ({ statusCode: 200, json: null }));
    expect(settings.discoverOidcEndpoints("https://id.example.com")).toBeNull();
  });
});
