import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./locales/en.json";
import pt_br from "./locales/pt_br.json";
import de from "./locales/de.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import it from "./locales/it.json";
import nl from "./locales/nl.json";
import pl from "./locales/pl.json";
import ru from "./locales/ru.json";
import zh_cn from "./locales/zh_cn.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";
import tr from "./locales/tr.json";
import uk from "./locales/uk.json";
import cs from "./locales/cs.json";
import da from "./locales/da.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pt_BR: { translation: pt_br },
      de: { translation: de },
      es: { translation: es },
      fr: { translation: fr },
      it: { translation: it },
      nl: { translation: nl },
      pl: { translation: pl },
      ru: { translation: ru },
      zh_CN: { translation: zh_cn },
      ja: { translation: ja },
      ko: { translation: ko },
      tr: { translation: tr },
      uk: { translation: uk },
      cs: { translation: cs },
      da: { translation: da },
    },
    fallbackLng: "en",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "zublo_language",
    },
  });

export default i18n;

export const SUPPORTED_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "pt_BR", name: "Português (Brasil)" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
  { code: "fr", name: "Français" },
  { code: "it", name: "Italiano" },
  { code: "nl", name: "Nederlands" },
  { code: "pl", name: "Polski" },
  { code: "ru", name: "Русский" },
  { code: "zh_CN", name: "中文 (简体)" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "tr", name: "Türkçe" },
  { code: "uk", name: "Українська" },
  { code: "cs", name: "Čeština" },
  { code: "da", name: "Dansk" },
];
