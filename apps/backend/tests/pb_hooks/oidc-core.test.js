const oidc = require("../../pb_hooks/lib/pure/oidc-core.js");

const fullSettings = {
  enabled: true,
  clientId: "client-123",
  clientSecret: "s3cr3t",
  issuerUrl: "https://idp.example.com",
  redirectUrl: "https://app.example.com/oidc/callback",
  scopes: "openid email profile",
};

describe("pb_hooks/lib/pure/oidc-core.js", () => {
  describe("normalizeIssuerUrl / buildDiscoveryUrl", () => {
    it("strips whitespace and trailing slashes from the issuer", () => {
      expect(oidc.normalizeIssuerUrl("  https://idp.example.com//  ")).toBe(
        "https://idp.example.com",
      );
      expect(oidc.normalizeIssuerUrl(undefined)).toBe("");
      expect(oidc.normalizeIssuerUrl(null)).toBe("");
    });

    it("appends the discovery path to an issuer root", () => {
      expect(oidc.buildDiscoveryUrl("https://idp.example.com/")).toBe(
        "https://idp.example.com/.well-known/openid-configuration",
      );
    });

    it("keeps a full discovery URL untouched", () => {
      const discovery = "https://idp.example.com/.well-known/openid-configuration";
      expect(oidc.buildDiscoveryUrl(discovery)).toBe(discovery);
    });

    it("only treats a trailing well-known path as an already-complete URL", () => {
      expect(oidc.buildDiscoveryUrl("https://idp.example.com/.well-known/openid-configuration/v2"))
        .toBe(
          "https://idp.example.com/.well-known/openid-configuration/v2"
          + "/.well-known/openid-configuration",
        );
    });

    it("returns an empty string when no issuer is configured", () => {
      expect(oidc.buildDiscoveryUrl("")).toBe("");
    });
  });

  describe("normalizeScopes", () => {
    it("falls back to the default scopes when none are configured", () => {
      expect(oidc.normalizeScopes("")).toBe("openid email profile");
      expect(oidc.normalizeScopes("   ")).toBe("openid email profile");
    });

    it("adds the openid scope when the admin forgot it", () => {
      expect(oidc.normalizeScopes("email  groups")).toBe("openid email groups");
    });

    it("keeps custom scopes that already include openid", () => {
      expect(oidc.normalizeScopes("openid email")).toBe("openid email");
    });
  });

  describe("isOidcConfigured", () => {
    it("accepts a fully configured provider", () => {
      expect(oidc.isOidcConfigured(fullSettings)).toBe(true);
    });

    it("rejects missing settings or a disabled provider", () => {
      expect(oidc.isOidcConfigured(null)).toBe(false);
      expect(oidc.isOidcConfigured({ ...fullSettings, enabled: false })).toBe(false);
    });

    it("rejects incomplete credentials", () => {
      expect(oidc.isOidcConfigured({ ...fullSettings, clientId: "" })).toBe(false);
      expect(oidc.isOidcConfigured({ ...fullSettings, clientSecret: " " })).toBe(false);
      expect(oidc.isOidcConfigured({ ...fullSettings, issuerUrl: "" })).toBe(false);
      expect(oidc.isOidcConfigured({ ...fullSettings, redirectUrl: "" })).toBe(false);
    });
  });

  describe("encodeFormBody", () => {
    it("encodes params and skips empty values", () => {
      expect(
        oidc.encodeFormBody({
          grant_type: "authorization_code",
          code: "a b",
          client_secret: "",
          scope: undefined,
        }),
      ).toBe("grant_type=authorization_code&code=a%20b");
    });

    it("returns an empty string when there is nothing to send", () => {
      expect(oidc.encodeFormBody(null)).toBe("");
    });
  });

  describe("extractDiscoveryEndpoints / hasRequiredEndpoints", () => {
    it("reads the endpoints and the declared issuer used by the login flow", () => {
      expect(
        oidc.extractDiscoveryEndpoints({
          issuer: "https://idp.example.com/",
          authorization_endpoint: " https://idp.example.com/authorize ",
          token_endpoint: "https://idp.example.com/token",
          userinfo_endpoint: "https://idp.example.com/userinfo",
        }),
      ).toEqual({
        issuer: "https://idp.example.com",
        authorizationEndpoint: "https://idp.example.com/authorize",
        tokenEndpoint: "https://idp.example.com/token",
        userInfoEndpoint: "https://idp.example.com/userinfo",
      });
    });

    it("returns empty endpoints for a missing document", () => {
      expect(oidc.extractDiscoveryEndpoints(undefined)).toEqual({
        issuer: "",
        authorizationEndpoint: "",
        tokenEndpoint: "",
        userInfoEndpoint: "",
      });
    });

    it("flags incomplete discovery documents", () => {
      const endpoints = oidc.extractDiscoveryEndpoints({
        issuer: "https://idp.example.com",
        authorization_endpoint: "https://idp.example.com/authorize",
        token_endpoint: "https://idp.example.com/token",
        userinfo_endpoint: "https://idp.example.com/userinfo",
      });

      expect(oidc.hasRequiredEndpoints(endpoints)).toBe(true);
      expect(oidc.hasRequiredEndpoints(null)).toBe(false);
      expect(oidc.hasRequiredEndpoints({ ...endpoints, issuer: "" })).toBe(false);
      expect(oidc.hasRequiredEndpoints({ ...endpoints, tokenEndpoint: "" })).toBe(false);
      expect(oidc.hasRequiredEndpoints({ ...endpoints, userInfoEndpoint: "" })).toBe(false);
      expect(oidc.hasRequiredEndpoints({ ...endpoints, authorizationEndpoint: "" })).toBe(false);
    });
  });

  describe("buildAuthorizationUrl", () => {
    it("builds a standard authorization code request", () => {
      expect(
        oidc.buildAuthorizationUrl({
          authorizationEndpoint: "https://idp.example.com/authorize",
          clientId: "client-123",
          redirectUrl: "https://app.example.com/oidc/callback",
          scopes: "openid email",
          state: "state-1",
          nonce: "nonce-1",
        }),
      ).toBe(
        "https://idp.example.com/authorize?response_type=code"
        + "&client_id=client-123"
        + "&redirect_uri=https%3A%2F%2Fapp.example.com%2Foidc%2Fcallback"
        + "&scope=openid%20email"
        + "&state=state-1"
        + "&nonce=nonce-1",
      );
    });

    it("appends to an authorization endpoint that already has a query string", () => {
      const url = oidc.buildAuthorizationUrl({
        authorizationEndpoint: "https://idp.example.com/authorize?tenant=acme",
        clientId: "client-123",
        redirectUrl: "https://app.example.com/oidc/callback",
        scopes: "",
        state: "state-1",
        nonce: "nonce-1",
      });

      expect(url).toContain("?tenant=acme&response_type=code");
      expect(url).toContain("scope=openid%20email%20profile");
    });
  });

  describe("extractOidcProfile", () => {
    it("normalizes the email and prefers the name claim", () => {
      expect(
        oidc.extractOidcProfile({
          sub: "abc",
          email: " Daniel@Example.com ",
          name: "Daniel",
          preferred_username: "dan",
        }),
      ).toEqual({
        subject: "abc",
        email: "daniel@example.com",
        emailVerified: null,
        name: "Daniel",
      });
    });

    it("falls back to preferred_username and then to the email local part", () => {
      expect(
        oidc.extractOidcProfile({ email: "daniel@example.com", preferred_username: "dan" }).name,
      ).toBe("dan");
      expect(oidc.extractOidcProfile({ email: "daniel@example.com" }).name).toBe("daniel");
    });

    it("returns empty values for missing claims", () => {
      expect(oidc.extractOidcProfile(null)).toEqual({
        subject: "",
        email: "",
        emailVerified: null,
        name: "",
      });
    });

    it("reads email_verified as a tri-state across the spellings providers use", () => {
      const verified = (claim) => oidc.extractOidcProfile({ email_verified: claim }).emailVerified;

      expect(verified(true)).toBe(true);
      expect(verified("true")).toBe(true);
      expect(verified("1")).toBe(true);
      expect(verified(false)).toBe(false);
      expect(verified("False")).toBe(false);
      expect(verified("0")).toBe(false);
      expect(verified(undefined)).toBe(null);
      expect(verified(null)).toBe(null);
      expect(verified("")).toBe(null);
      expect(verified("maybe")).toBe(null);
    });
  });

  describe("canClaimExistingAccount", () => {
    it("only lets a positively verified email adopt an existing account", () => {
      expect(oidc.canClaimExistingAccount({ emailVerified: true })).toBe(true);
      expect(oidc.canClaimExistingAccount({ emailVerified: false })).toBe(false);
      // A provider that stays silent is not an endorsement.
      expect(oidc.canClaimExistingAccount({ emailVerified: null })).toBe(false);
      expect(oidc.canClaimExistingAccount(null)).toBe(false);
    });
  });

  describe("state token", () => {
    const sign = (payload) => "sig(" + payload + ")";
    const now = 1_700_000_000_000;

    it("creates a signed token and accepts it back", () => {
      const token = oidc.createStateToken("nonce-1", now, sign);
      expect(token).toBe("nonce-1.1700000000000.sig(nonce-1.1700000000000)");
      expect(oidc.verifyStateToken(token, sign, now + 1000, oidc.STATE_TTL_MS)).toBe(true);
    });

    it("uses the default TTL when none is provided", () => {
      const token = oidc.createStateToken("nonce-1", now, sign);
      expect(oidc.verifyStateToken(token, sign, now + 1000)).toBe(true);
      expect(oidc.verifyStateToken(token, sign, now + oidc.STATE_TTL_MS + 1)).toBe(false);
    });

    it("rejects malformed, tampered, expired and future tokens", () => {
      const token = oidc.createStateToken("nonce-1", now, sign);

      expect(oidc.verifyStateToken("", sign, now)).toBe(false);
      expect(oidc.verifyStateToken("nonce-1.123", sign, now)).toBe(false);
      expect(oidc.verifyStateToken("nonce-1.not-a-date.sig", sign, now)).toBe(false);
      expect(oidc.verifyStateToken("nonce-1.0.sig", sign, now)).toBe(false);
      expect(oidc.verifyStateToken("nonce-1." + now + ".", sign, now)).toBe(false);
      expect(oidc.verifyStateToken(".1700000000000.sig", sign, now)).toBe(false);
      expect(oidc.verifyStateToken(token, () => "other-signature", now)).toBe(false);
      expect(oidc.verifyStateToken(token, sign, now - 1000)).toBe(false);
    });

    it("delegates the signature comparison so callers can compare in constant time", () => {
      const token = oidc.createStateToken("nonce-1", now, sign);
      const equals = vi.fn((a, b) => a === b);

      expect(oidc.verifyStateToken(token, sign, now, oidc.STATE_TTL_MS, equals)).toBe(true);
      expect(equals).toHaveBeenCalledWith(
        "sig(nonce-1.1700000000000)",
        "sig(nonce-1.1700000000000)",
      );
    });

    it("recovers the nonce so the callback can match it against the id_token", () => {
      expect(oidc.readStateNonce(oidc.createStateToken("nonce-1", now, sign))).toBe("nonce-1");
      expect(oidc.readStateNonce("")).toBe("");
      expect(oidc.readStateNonce(".1700000000000.sig")).toBe("");
      expect(oidc.readStateNonce("no-separators")).toBe("");
    });
  });

  describe("canProvisionNewAccount", () => {
    const count = (value) => () => value;

    it("refuses to create accounts while registrations are closed", () => {
      expect(oidc.canProvisionNewAccount({ openRegistrations: false }, count(0))).toBe(false);
      expect(oidc.canProvisionNewAccount(null, count(0))).toBe(false);
    });

    it("allows creation when registrations are open and no limit is set", () => {
      expect(oidc.canProvisionNewAccount({ openRegistrations: true }, count(999))).toBe(true);
      expect(oidc.canProvisionNewAccount({ openRegistrations: true, maxUsers: 0 }, count(999)))
        .toBe(true);
    });

    it("stops creating accounts once max_users is reached", () => {
      const policy = { openRegistrations: true, maxUsers: 3 };

      expect(oidc.canProvisionNewAccount(policy, count(2))).toBe(true);
      expect(oidc.canProvisionNewAccount(policy, count(3))).toBe(false);
      expect(oidc.canProvisionNewAccount(policy, count(4))).toBe(false);
    });

    it("ignores an unusable limit rather than locking everyone out", () => {
      expect(oidc.canProvisionNewAccount({ openRegistrations: true, maxUsers: NaN }, count(5)))
        .toBe(true);
      expect(oidc.canProvisionNewAccount({ openRegistrations: true, maxUsers: -1 }, count(5)))
        .toBe(true);
    });

    it("does not count the users at all unless a limit is configured", () => {
      const countUsers = vi.fn(() => 0);

      expect(oidc.canProvisionNewAccount({ openRegistrations: false }, countUsers)).toBe(false);
      expect(oidc.canProvisionNewAccount({ openRegistrations: true }, countUsers)).toBe(true);
      expect(countUsers).not.toHaveBeenCalled();

      expect(oidc.canProvisionNewAccount({ openRegistrations: true, maxUsers: 2 }, countUsers))
        .toBe(true);
      expect(countUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe("validateIdTokenClaims", () => {
    const now = 1_700_000_000_000;
    const validClaims = {
      iss: "https://idp.example.com",
      aud: "client-123",
      exp: now / 1000 + 300,
      nonce: "nonce-1",
      sub: "abc",
    };
    const validate = (overrides) => oidc.validateIdTokenClaims({
      claims: validClaims,
      expectedIssuer: "https://idp.example.com",
      clientId: "client-123",
      nonce: "nonce-1",
      now: now,
      ...overrides,
    });

    it("accepts a token minted by the discovered issuer for this client", () => {
      expect(validate({})).toBe(null);
      // The issuer is compared normalized, so a trailing slash is not a mismatch.
      expect(validate({ expectedIssuer: "https://idp.example.com/" })).toBe(null);
    });

    it("rejects a token that is missing entirely", () => {
      expect(oidc.validateIdTokenClaims({}).includes("missing")).toBe(true);
      expect(oidc.validateIdTokenClaims().includes("missing")).toBe(true);
    });

    it("rejects a token minted by another issuer", () => {
      expect(validate({ claims: { ...validClaims, iss: "https://evil.example.com" } }))
        .toBe("id_token issuer mismatch");
      // No discovered issuer means nothing to compare against, so nothing to trust.
      expect(validate({ expectedIssuer: "" })).toBe("id_token issuer mismatch");
    });

    it("rejects a token issued for another client", () => {
      expect(validate({ claims: { ...validClaims, aud: "other-client" } }))
        .toBe("id_token audience mismatch");
      expect(validate({ clientId: "" })).toBe("id_token audience mismatch");
    });

    it("accepts a multi-audience token only when azp names this client", () => {
      const multi = { ...validClaims, aud: ["client-123", "other-client"] };

      expect(validate({ claims: { ...multi, azp: "client-123" } })).toBe(null);
      expect(validate({ claims: multi })).toBe("id_token authorized party mismatch");
      expect(validate({ claims: { ...multi, azp: "other-client" } }))
        .toBe("id_token authorized party mismatch");
    });

    it("rejects a token with no usable expiry", () => {
      expect(validate({ claims: { ...validClaims, exp: undefined } }))
        .toBe("id_token has no expiry");
      expect(validate({ claims: { ...validClaims, exp: 0 } })).toBe("id_token has no expiry");
    });

    it("rejects an expired token but allows a minute of clock skew", () => {
      const expiredAt = { ...validClaims, exp: now / 1000 - 30 };

      expect(validate({ claims: expiredAt })).toBe(null);
      expect(validate({ claims: expiredAt, leewayMs: 0 })).toBe("id_token expired");
      expect(validate({ claims: { ...validClaims, exp: now / 1000 - 3600 } }))
        .toBe("id_token expired");
    });

    it("rejects a token that does not echo the nonce minted in /authorize", () => {
      expect(validate({ nonce: "another-nonce" })).toBe("id_token nonce mismatch");
      expect(validate({ claims: { ...validClaims, nonce: undefined } }))
        .toBe("id_token nonce mismatch");
    });
  });
});
