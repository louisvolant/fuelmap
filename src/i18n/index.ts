import i18n from "i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { initReactI18next } from "react-i18next";

import de from "./locales/de/translation.json";
import es from "./locales/es/translation.json";
import fr from "./locales/fr/translation.json";
import it from "./locales/it/translation.json";
import nl from "./locales/nl/translation.json";
import pt from "./locales/pt/translation.json";
import uk from "./locales/uk/translation.json";

/**
 * Supported UI languages. English is intentionally not shipped as a UI locale:
 * translations are the source of truth for the app copy, while code and
 * comments are always English.
 */
export const SUPPORTED_LANGUAGES = ["fr", "uk", "de", "es", "pt", "it", "nl"] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const FALLBACK_LANGUAGE: SupportedLanguage = "fr";

/** Human-readable language names, used by the language switcher. */
export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  fr: "Français",
  uk: "Українська",
  de: "Deutsch",
  es: "Español",
  pt: "Português",
  it: "Italiano",
  nl: "Nederlands",
};

/** Key used to persist the user's language choice in localStorage. */
export const LANGUAGE_STORAGE_KEY = "fuelmap.language";

const resources = {
  fr: { translation: fr },
  uk: { translation: uk },
  de: { translation: de },
  es: { translation: es },
  pt: { translation: pt },
  it: { translation: it },
  nl: { translation: nl },
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // Resources are bundled, so initialize synchronously (avoids a first render
    // with untranslated keys and keeps unit tests deterministic).
    initAsync: false,
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: SUPPORTED_LANGUAGES,
    // Treat "pt-BR" as "pt" and collapse any region variant to its base language.
    load: "languageOnly",
    nonExplicitSupportedLngs: true,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
  });

export default i18n;
