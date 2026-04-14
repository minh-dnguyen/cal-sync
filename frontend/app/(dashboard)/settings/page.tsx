"use client";

import { useEffect, useState } from "react";
import { Globe, Clock, WifiOff, Palette, Check } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useSettingsStore, DateFormat, TimeFormat } from "@/store/settingsStore";
import { COUNTRIES as REGIONS } from "@/lib/geoData";

// ─── Data ────────────────────────────────────────────────────────────────────

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "ar", label: "Arabic — العربية" },
  { value: "bn", label: "Bengali — বাংলা" },
  { value: "bg", label: "Bulgarian — Български" },
  { value: "ca", label: "Catalan — Català" },
  { value: "zh", label: "Chinese — 中文" },
  { value: "hr", label: "Croatian — Hrvatski" },
  { value: "cs", label: "Czech — Čeština" },
  { value: "da", label: "Danish — Dansk" },
  { value: "nl", label: "Dutch — Nederlands" },
  { value: "et", label: "Estonian — Eesti" },
  { value: "fi", label: "Finnish — Suomi" },
  { value: "fr", label: "French — Français" },
  { value: "de", label: "German — Deutsch" },
  { value: "el", label: "Greek — Ελληνικά" },
  { value: "he", label: "Hebrew — עברית" },
  { value: "hi", label: "Hindi — हिन्दी" },
  { value: "hu", label: "Hungarian — Magyar" },
  { value: "id", label: "Indonesian — Bahasa Indonesia" },
  { value: "it", label: "Italian — Italiano" },
  { value: "ja", label: "Japanese — 日本語" },
  { value: "ko", label: "Korean — 한국어" },
  { value: "lv", label: "Latvian — Latviešu" },
  { value: "lt", label: "Lithuanian — Lietuvių" },
  { value: "ms", label: "Malay — Bahasa Melayu" },
  { value: "no", label: "Norwegian — Norsk" },
  { value: "fa", label: "Persian — فارسی" },
  { value: "pl", label: "Polish — Polski" },
  { value: "pt", label: "Portuguese — Português" },
  { value: "ro", label: "Romanian — Română" },
  { value: "ru", label: "Russian — Русский" },
  { value: "sr", label: "Serbian — Srpski" },
  { value: "sk", label: "Slovak — Slovenčina" },
  { value: "sl", label: "Slovenian — Slovenščina" },
  { value: "es", label: "Spanish — Español" },
  { value: "sv", label: "Swedish — Svenska" },
  { value: "th", label: "Thai — ภาษาไทย" },
  { value: "tr", label: "Turkish — Türkçe" },
  { value: "uk", label: "Ukrainian — Українська" },
  { value: "ur", label: "Urdu — اردو" },
  { value: "vi", label: "Vietnamese — Tiếng Việt" },
];

const DATE_FORMATS: { value: DateFormat; label: string; example: string }[] = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "04/12/2026" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "12/04/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2026-04-12" },
  { value: "DD.MM.YYYY", label: "DD.MM.YYYY", example: "12.04.2026" },
  { value: "D MMMM YYYY", label: "D MMMM YYYY", example: "12 April 2026" },
];

const TIME_FORMATS: { value: TimeFormat; label: string; example: string }[] = [
  { value: "12h", label: "12-hour clock", example: "1:30 PM" },
  { value: "24h", label: "24-hour clock", example: "13:30" },
];

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    /*
     * overflow: visible (no overflow-hidden) so that SearchableSelect dropdowns
     * (position: absolute) can extend beyond the section boundary.
     * The header clips its own background to the top rounded corners with
     * rounded-t-xl + overflow-hidden applied directly on that div.
     */
    <section className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-t-xl overflow-hidden">
        <span className="text-primary-500">{icon}</span>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </section>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-6">
      <div className="sm:w-40 flex-shrink-0 pt-0.5">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-200">{label}</p>
        {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{hint}</p>}
      </div>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 ${
        checked ? "bg-primary-500" : "bg-gray-200 dark:bg-gray-600"
      }`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { t } = useTranslation();
  const {
    language,
    region,
    dateFormat,
    timeFormat,
    offlineMode,
    setLanguage,
    setRegion,
    setDateFormat,
    setTimeFormat,
    setOfflineMode,
  } = useSettingsStore();

  const [saved, setSaved] = useState(false);

  // "Saved" flash indicator
  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-5">

        {/* Page header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{t("settings_title")}</h1>
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
              <Check size={13} />
              {t("saved_indicator")}
            </span>
          )}
        </div>

        {/* ── Language & Region ─────────────────────────────────────── */}
        <Section icon={<Globe size={16} />} title={t("lang_region_section")}>
          <FieldRow label={t("language")} hint={t("language_hint")}>
            <SearchableSelect
              options={LANGUAGES}
              value={language}
              onChange={(v) => { setLanguage(v); flashSaved(); }}
              placeholder="Search language…"
            />
          </FieldRow>

          <FieldRow label={t("region")} hint={t("region_hint")}>
            <SearchableSelect
              options={REGIONS}
              value={region}
              onChange={(v) => { setRegion(v); flashSaved(); }}
              placeholder="Search country / region…"
            />
          </FieldRow>
        </Section>

        {/* ── Date & Time ───────────────────────────────────────────── */}
        <Section icon={<Clock size={16} />} title={t("datetime_section")}>
          <FieldRow label={t("date_format")}>
            <select
              value={dateFormat}
              onChange={(e) => { setDateFormat(e.target.value as DateFormat); flashSaved(); }}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {DATE_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label} — e.g. {f.example}
                </option>
              ))}
            </select>
          </FieldRow>

          <FieldRow label={t("time_format")}>
            <select
              value={timeFormat}
              onChange={(e) => { setTimeFormat(e.target.value as TimeFormat); flashSaved(); }}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            >
              {TIME_FORMATS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label} — e.g. {f.example}
                </option>
              ))}
            </select>
          </FieldRow>
        </Section>

        {/* ── Offline Mode ──────────────────────────────────────────── */}
        <Section icon={<WifiOff size={16} />} title={t("offline_section")}>
          <FieldRow
            label={t("enable_offline")}
            hint={t("offline_hint")}
          >
            <div className="flex items-center gap-3 pt-0.5">
              <Toggle
                checked={offlineMode}
                onChange={(v) => { setOfflineMode(v); flashSaved(); }}
              />
              <span className="text-sm text-gray-600 dark:text-gray-300">
                {offlineMode ? t("offline_on") : t("offline_off")}
              </span>
            </div>
            {offlineMode && (
              <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2">
                {t("offline_notice")}
              </p>
            )}
          </FieldRow>
        </Section>

        {/* ── Appearance ────────────────────────────────────────────── */}
        <Section icon={<Palette size={16} />} title={t("appearance_section")}>
          <FieldRow
            label={t("theme_label")}
            hint={t("theme_hint")}
          >
            <ThemeToggle variant="dropdown" />
          </FieldRow>
        </Section>

      </div>
    </div>
  );
}
