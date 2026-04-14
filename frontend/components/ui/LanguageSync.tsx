"use client";

import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSettingsStore } from "@/store/settingsStore";

const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);

/**
 * Invisible component that keeps the i18next language in sync with the
 * persisted settings store, and updates <html lang> / <html dir>.
 * Mount once inside Providers.
 */
export function LanguageSync() {
  const { i18n } = useTranslation();
  const language = useSettingsStore((s) => s.language);

  useEffect(() => {
    if (i18n.language !== language) {
      i18n.changeLanguage(language);
    }
    document.documentElement.lang = language;
    document.documentElement.dir = RTL_LANGS.has(language) ? "rtl" : "ltr";
  }, [language, i18n]);

  return null;
}
