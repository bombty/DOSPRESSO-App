import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import HttpBackend from "i18next-http-backend";
import LanguageDetector from "i18next-browser-languagedetector";

export const SUPPORTED_LANGUAGES = ["tr", "en", "ar", "de"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  tr: "Türkçe",
  en: "English",
  ar: "العربية",
  de: "Deutsch",
};

export const RTL_LANGUAGES: SupportedLanguage[] = ["ar"];

const NAMESPACES = ["common", "auth", "dashboard"];

function applyDirection(lng: string) {
  const isRTL = RTL_LANGUAGES.includes(lng as SupportedLanguage);
  document.documentElement.dir = isRTL ? "rtl" : "ltr";
  document.documentElement.lang = lng;
}

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: "tr",
    supportedLngs: SUPPORTED_LANGUAGES as unknown as string[],
    load: "languageOnly",
    defaultNS: "common",
    ns: NAMESPACES,
    interpolation: {
      escapeValue: false,
    },
    backend: {
      loadPath: "/locales/{{lng}}/{{ns}}.json",
    },
    detection: {
      order: ["localStorage", "navigator"],
      lookupLocalStorage: "dospresso_language",
      caches: ["localStorage"],
    },
    react: {
      useSuspense: false,
    },
    missingKeyHandler:
      import.meta.env.DEV
        ? (_lngs: readonly string[], ns: string, key: string) => {
            console.warn(`[i18n] Missing key: ${ns}:${key}`);
          }
        : undefined,
    saveMissing: import.meta.env.DEV,
  });

i18n.on("languageChanged", applyDirection);

applyDirection(i18n.language || "tr");

export default i18n;
