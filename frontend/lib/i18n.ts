import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { TRANSLATIONS, defaultTranslation } from "./translations";

// Build i18next resources from our translations map
const resources = Object.fromEntries(
  Object.entries(TRANSLATIONS).map(([lang, strings]) => [
    lang,
    { common: strings },
  ])
);

i18n.use(initReactI18next).init({
  resources,
  // Fallback language when a key is missing in the active language
  fallbackLng: "en",
  defaultNS: "common",
  // Interpolation: {{region}} style (matches our keys)
  interpolation: { escapeValue: false },
  // Don't crash on missing keys — just return the key name
  saveMissing: false,
  // Start with English; I18nProvider overrides this from the persisted store
  lng: "en",
});

export default i18n;

/** Return the translation object for the given language, falling back to English. */
export function getT(lang: string): typeof defaultTranslation {
  return (TRANSLATIONS[lang] ?? defaultTranslation);
}
