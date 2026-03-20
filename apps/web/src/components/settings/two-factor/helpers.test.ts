import { LS_KEYS } from "@/lib/constants";

import { clearTrustedDevice } from "./helpers";

describe("two-factor helpers", () => {
  it("removes the trusted-device key for the given user", () => {
    const removeItem = vi.fn();
    vi.stubGlobal("localStorage", { removeItem });

    clearTrustedDevice("user-1");

    expect(removeItem).toHaveBeenCalledWith(LS_KEYS.totpTrusted("user-1"));

    vi.unstubAllGlobals();
  });
});
