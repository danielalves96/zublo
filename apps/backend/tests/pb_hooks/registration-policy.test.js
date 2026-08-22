const {
  REGISTRATIONS_CLOSED,
  USER_LIMIT_REACHED,
  isBootstrap,
  isRegistrationOpen,
  registrationRejection,
} = require("../../pb_hooks/lib/pure/registration-policy.js");

const OPEN = { openRegistrations: true, maxUsers: 0 };
const CLOSED = { openRegistrations: false, maxUsers: 0 };

describe("pb_hooks/lib/pure/registration-policy.js", () => {
  describe("isBootstrap", () => {
    it("is true only while the instance has no users", () => {
      expect(isBootstrap(0)).toBe(true);
      expect(isBootstrap(1)).toBe(false);
    });

    it("treats an unusable count as an empty instance", () => {
      expect(isBootstrap(undefined)).toBe(true);
      expect(isBootstrap(NaN)).toBe(true);
      expect(isBootstrap(-4)).toBe(true);
    });
  });

  describe("registrationRejection", () => {
    it("always lets the first account through, whatever the settings say", () => {
      // A fresh instance defaults to every toggle off, so refusing here would
      // lock the owner out of their own deployment.
      expect(registrationRejection(CLOSED, 0)).toBeNull();
      expect(registrationRejection(null, 0)).toBeNull();
    });

    it("refuses a signup once registrations are closed", () => {
      expect(registrationRejection(CLOSED, 1)).toBe(REGISTRATIONS_CLOSED);
    });

    it("refuses a signup when no settings record exists at all", () => {
      expect(registrationRejection(null, 1)).toBe(REGISTRATIONS_CLOSED);
      expect(registrationRejection(undefined, 1)).toBe(REGISTRATIONS_CLOSED);
    });

    it("allows a signup while registrations are open and no limit is set", () => {
      expect(registrationRejection(OPEN, 1)).toBeNull();
      expect(registrationRejection(OPEN, 9999)).toBeNull();
    });

    it("ignores a limit that is zero, negative, or unparseable", () => {
      expect(registrationRejection({ openRegistrations: true, maxUsers: 0 }, 50)).toBeNull();
      expect(registrationRejection({ openRegistrations: true, maxUsers: -1 }, 50)).toBeNull();
      expect(registrationRejection({ openRegistrations: true, maxUsers: "many" }, 50)).toBeNull();
      expect(registrationRejection({ openRegistrations: true }, 50)).toBeNull();
    });

    it("allows a signup up to the limit and refuses the one that would exceed it", () => {
      const limited = { openRegistrations: true, maxUsers: 3 };

      expect(registrationRejection(limited, 2)).toBeNull();
      expect(registrationRejection(limited, 3)).toBe(USER_LIMIT_REACHED);
      expect(registrationRejection(limited, 4)).toBe(USER_LIMIT_REACHED);
    });

    it("reads a limit that arrived as a string", () => {
      const limited = { openRegistrations: true, maxUsers: "3" };

      expect(registrationRejection(limited, 2)).toBeNull();
      expect(registrationRejection(limited, 3)).toBe(USER_LIMIT_REACHED);
    });

    it("checks the closed toggle before the limit", () => {
      const closedButUnderLimit = { openRegistrations: false, maxUsers: 100 };
      expect(registrationRejection(closedButUnderLimit, 1)).toBe(REGISTRATIONS_CLOSED);
    });
  });

  describe("isRegistrationOpen", () => {
    it("mirrors registrationRejection as a boolean", () => {
      expect(isRegistrationOpen(OPEN, 1)).toBe(true);
      expect(isRegistrationOpen(CLOSED, 1)).toBe(false);
      expect(isRegistrationOpen(CLOSED, 0)).toBe(true);
      expect(isRegistrationOpen({ openRegistrations: true, maxUsers: 2 }, 2)).toBe(false);
    });
  });
});
