import i18n, { SUPPORTED_LANGUAGES } from "./i18n";
import { LS_KEYS } from "./constants";

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
});
