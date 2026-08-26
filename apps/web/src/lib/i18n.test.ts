import { LS_KEYS } from "./constants";
import i18n, { SUPPORTED_LANGUAGES } from "./i18n";

describe("i18n", () => {
  it("configures the expected fallback language and localStorage key", () => {
    expect(i18n.options.fallbackLng).toEqual(["en"]);
    expect(i18n.options.detection).toMatchObject({
      lookupLocalStorage: LS_KEYS.LANGUAGE,
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    });
  });

  it("exposes the supported languages list", () => {
    expect(SUPPORTED_LANGUAGES).toEqual(
      expect.arrayContaining([
        { code: "en", name: "English" },
        { code: "pt_BR", name: "Português (Brasil)" },
        { code: "zh_CN", name: "中文 (简体)" },
      ]),
    );
    expect(SUPPORTED_LANGUAGES).toHaveLength(16);
  });

  it("translates the income-credit workflow in every supported language", () => {
    const creditKeys = [
      "record_type",
      "expense",
      "credit_income",
      "credit_income_hint",
      "expense_hint",
      "one_time_payout",
      "one_time_payout_hint",
      "received_on",
      "one_time",
      "credits_this_month",
    ];

    for (const { code } of SUPPORTED_LANGUAGES) {
      const resources = i18n.getResourceBundle(code, "translation");
      for (const key of creditKeys) {
        expect(resources[key], `${code}.${key}`).toBeTruthy();
      }
    }
  });

  it("translates subscription view controls in every supported language", () => {
    const viewKeys = ["view", "grid_view", "list_view"];

    for (const { code } of SUPPORTED_LANGUAGES) {
      const resources = i18n.getResourceBundle(code, "translation");
      for (const key of viewKeys) {
        expect(resources[key], `${code}.${key}`).toBeTruthy();
      }
    }
  });
});
