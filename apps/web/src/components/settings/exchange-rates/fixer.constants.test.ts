import { FIXER_PROVIDER_LINKS } from "@/components/settings/exchange-rates/fixer.constants";

describe("fixer.constants", () => {
  it("maps each provider to the correct product page", () => {
    expect(FIXER_PROVIDER_LINKS).toEqual({
      fixer: "https://fixer.io/product",
      apilayer: "https://apilayer.com/marketplace/fixer-api",
    });
  });
});
