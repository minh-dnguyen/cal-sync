"use client";

import { useState, useEffect } from "react";
import { Globe, Clock, WifiOff, Palette, Check, Link2, RefreshCw, Unlink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { useSettingsStore, DateFormat, TimeFormat } from "@/store/settingsStore";
import { COUNTRIES as REGIONS } from "@/lib/geoData";
import { useGoogleInit, useSyncGoogleCalendar, useOutlookInit, useSyncOutlookCalendar, useDisconnectCalendarSource } from "@/hooks/useEvents";
import api from "@/lib/api";
import { CalendarSource } from "@/types";
import { GoogleColorModal } from "@/components/calendar/GoogleColorModal";
import { OutlookColorModal } from "@/components/calendar/OutlookColorModal";

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
    <section className="bg-app-surface dark:bg-[#4E5F9A] rounded-xl border border-app-border dark:border-[#3a4f84]">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-app-border dark:border-[#3a4f84] bg-app-surface dark:bg-[#4E5F9A] rounded-t-xl overflow-hidden">
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

  const qc = useQueryClient();
  const [saved, setSaved] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const [syncMsg, setSyncMsg] = useState("");
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const [keepColorsLocal, setKeepColorsLocal] = useState<boolean | null>(null);
  const [outlookError, setOutlookError] = useState("");
  const [outlookSyncMsg, setOutlookSyncMsg] = useState("");
  const [outlookColorModalOpen, setOutlookColorModalOpen] = useState(false);
  const [keepOutlookColorsLocal, setKeepOutlookColorsLocal] = useState<boolean | null>(null);

  const googleInit = useGoogleInit();
  const syncGoogle = useSyncGoogleCalendar();
  const outlookInit = useOutlookInit();
  const syncOutlook = useSyncOutlookCalendar();
  const disconnectSource = useDisconnectCalendarSource();

  const updateSource = useMutation({
    mutationFn: ({ id, keep_source_colors }: { id: string; keep_source_colors: boolean }) =>
      api.patch(`/api/v1/calendar-sources/${id}`, { keep_source_colors }).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-sources"] }),
    onError: () => {
      // Revert optimistic update on failure
      setKeepColorsLocal(null);
    },
  });

  const { data: sources = [] } = useQuery<CalendarSource[]>({
    queryKey: ["calendar-sources"],
    queryFn: () => api.get("/api/v1/calendar-sources").then((r) => r.data),
  });

  const googleSource  = sources.find((s) => s.source_type === "google");
  const outlookSource = sources.find((s) => s.source_type === "outlook");

  // After OAuth redirect, show the color dialog automatically
  useEffect(() => {
    const justConnected = localStorage.getItem("calsync-google-just-connected") === "true";
    if (justConnected) {
      localStorage.removeItem("calsync-google-just-connected");
      setColorModalOpen(true);
    }
    const outlookJustConnected = localStorage.getItem("calsync-outlook-just-connected") === "true";
    if (outlookJustConnected) {
      localStorage.removeItem("calsync-outlook-just-connected");
      setOutlookColorModalOpen(true);
    }
  }, []);

  // "Saved" flash indicator
  function flashSaved() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleConnectGoogle() {
    setGoogleError("");
    googleInit.mutate(undefined, {
      onSuccess: (authUrl) => { window.location.href = authUrl; },
      onError: () => setGoogleError(t("google_connect_error")),
    });
  }

  // Called when user picks a color preference in the modal (after OAuth)
  function handleColorChoice(keepColors: boolean) {
    setColorModalOpen(false);
    if (!googleSource) return;

    // Optimistic update
    setKeepColorsLocal(keepColors);

    // Persist preference then immediately sync to apply colors
    updateSource.mutate(
      { id: googleSource.id, keep_source_colors: keepColors },
      {
        onSuccess: () => {
          syncGoogle.mutate(googleSource.id, {
            onSuccess: (data) => {
              setSyncMsg(`Synced ${data.synced} new event${data.synced !== 1 ? "s" : ""}.`);
              setTimeout(() => setSyncMsg(""), 5000);
            },
            onError: () => setGoogleError(t("google_sync_error")),
          });
        },
      }
    );
  }

  function handleSyncGoogle(sourceId: string) {
    setSyncMsg("");
    setGoogleError("");
    syncGoogle.mutate(sourceId, {
      onSuccess: (data) => {
        setSyncMsg(`Synced ${data.synced} new event${data.synced !== 1 ? "s" : ""}.`);
        setTimeout(() => setSyncMsg(""), 4000);
      },
      onError: () => setGoogleError(t("google_sync_error")),
    });
  }

  function handleDisconnectGoogle(sourceId: string) {
    if (!window.confirm(t("disconnect_confirm"))) return;
    setGoogleError("");
    disconnectSource.mutate(sourceId, {
      onError: () => setGoogleError("Failed to disconnect. Try again."),
    });
  }

  function handleOutlookColorChoice(keepColors: boolean) {
    setOutlookColorModalOpen(false);
    if (!outlookSource) return;
    setKeepOutlookColorsLocal(keepColors);
    updateSource.mutate(
      { id: outlookSource.id, keep_source_colors: keepColors },
      {
        onSuccess: () => {
          syncOutlook.mutate(outlookSource.id, {
            onSuccess: (data) => {
              setOutlookSyncMsg(`Synced ${data.synced} new event${data.synced !== 1 ? "s" : ""}.`);
              setTimeout(() => setOutlookSyncMsg(""), 5000);
            },
            onError: () => setOutlookError(t("outlook_sync_error")),
          });
        },
      }
    );
  }

  function handleConnectOutlook() {
    setOutlookError("");
    outlookInit.mutate(undefined, {
      onSuccess: (authUrl) => { window.location.href = authUrl; },
      onError: () => setOutlookError(t("outlook_connect_error")),
    });
  }

  function handleSyncOutlook(sourceId: string) {
    setOutlookSyncMsg("");
    setOutlookError("");
    syncOutlook.mutate(sourceId, {
      onSuccess: (data) => {
        setOutlookSyncMsg(`Synced ${data.synced} new event${data.synced !== 1 ? "s" : ""}.`);
        setTimeout(() => setOutlookSyncMsg(""), 4000);
      },
      onError: () => setOutlookError(t("outlook_sync_error")),
    });
  }

  function handleDisconnectOutlook(sourceId: string) {
    if (!window.confirm(t("disconnect_outlook_confirm"))) return;
    setOutlookError("");
    disconnectSource.mutate(sourceId, {
      onError: () => setOutlookError("Failed to disconnect. Try again."),
    });
  }

  const keepColorsValue = keepColorsLocal ?? googleSource?.keep_source_colors ?? false;
  const keepOutlookColorsValue = keepOutlookColorsLocal ?? outlookSource?.keep_source_colors ?? false;

  return (
    <div className="flex-1 overflow-y-auto bg-app-bg dark:bg-[#1e2b4a]">
      <GoogleColorModal
        open={colorModalOpen}
        onClose={() => setColorModalOpen(false)}
        onConfirm={handleColorChoice}
      />
      <OutlookColorModal
        open={outlookColorModalOpen}
        onClose={() => setOutlookColorModalOpen(false)}
        onConfirm={handleOutlookColorChoice}
      />
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
              className="w-full px-3 py-2.5 rounded-lg border border-app-border bg-app-input text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
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
              className="w-full px-3 py-2.5 rounded-lg border border-app-border bg-app-input text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent"
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

        {/* ── Connected Accounts ────────────────────────────────────── */}
        <Section icon={<Link2 size={16} />} title={t("connected_accounts_section")}>
          {googleError && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 mb-2">
              {googleError}
            </p>
          )}
          {syncMsg && (
            <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 mb-2">
              {syncMsg}
            </p>
          )}

          {outlookError && (
            <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2 mb-2">
              {outlookError}
            </p>
          )}
          {outlookSyncMsg && (
            <p className="text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg px-3 py-2 mb-2">
              {outlookSyncMsg}
            </p>
          )}

          <FieldRow label="Google Calendar">
            {googleSource ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {googleSource.connected_email
                    ? t("google_connected_as", { email: googleSource.connected_email })
                    : t("google_connected")}
                </p>

                {/* Keep Google colors toggle */}
                <label className="flex items-center gap-2.5 cursor-pointer w-fit">
                  <Toggle
                    checked={keepColorsValue}
                    onChange={(v) => {
                      setKeepColorsLocal(v); // immediate visual feedback
                      updateSource.mutate(
                        { id: googleSource.id, keep_source_colors: v },
                        {
                          onSuccess: () => {
                            // Re-sync so color changes take effect on existing events
                            syncGoogle.mutate(googleSource.id, {
                              onSuccess: (data) => {
                                setSyncMsg(`Colors updated — ${data.synced} new event${data.synced !== 1 ? "s" : ""} synced.`);
                                setTimeout(() => setSyncMsg(""), 4000);
                              },
                            });
                          },
                        }
                      );
                    }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {t("keep_google_colors")}
                  </span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={syncGoogle.isPending}
                    onClick={() => handleSyncGoogle(googleSource.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-app-border bg-app-input text-gray-700 dark:text-gray-200 hover:bg-app-surface transition-colors disabled:opacity-60 disabled:cursor-wait"
                  >
                    <RefreshCw size={12} className={syncGoogle.isPending ? "animate-spin" : ""} />
                    {syncGoogle.isPending ? t("syncing_google") : t("sync_now")}
                  </button>
                  <button
                    type="button"
                    disabled={disconnectSource.isPending}
                    onClick={() => handleDisconnectGoogle(googleSource.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60 disabled:cursor-wait"
                  >
                    <Unlink size={12} />
                    {disconnectSource.isPending ? t("disconnecting") : t("disconnect")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={googleInit.isPending}
                onClick={handleConnectGoogle}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-app-input border border-app-border text-gray-700 dark:text-gray-200 hover:bg-app-surface transition-colors disabled:opacity-60 disabled:cursor-wait shadow-sm"
              >
                {/* Google "G" icon */}
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {googleInit.isPending ? t("connecting_google") : t("connect_google")}
              </button>
            )}
          </FieldRow>

          <FieldRow label="Outlook Calendar">
            {outlookSource ? (
              <div className="flex flex-col gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {outlookSource.connected_email
                    ? t("outlook_connected_as", { email: outlookSource.connected_email })
                    : t("outlook_connected")}
                </p>

                {/* Keep Outlook colors toggle */}
                <label className="flex items-center gap-2.5 cursor-pointer w-fit">
                  <Toggle
                    checked={keepOutlookColorsValue}
                    onChange={(v) => {
                      setKeepOutlookColorsLocal(v);
                      updateSource.mutate(
                        { id: outlookSource.id, keep_source_colors: v },
                        {
                          onSuccess: () => {
                            syncOutlook.mutate(outlookSource.id, {
                              onSuccess: (data) => {
                                setOutlookSyncMsg(`Colors updated — ${data.synced} new event${data.synced !== 1 ? "s" : ""} synced.`);
                                setTimeout(() => setOutlookSyncMsg(""), 4000);
                              },
                            });
                          },
                        }
                      );
                    }}
                  />
                  <span className="text-xs text-gray-600 dark:text-gray-300">
                    {t("keep_outlook_colors")}
                  </span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={syncOutlook.isPending}
                    onClick={() => handleSyncOutlook(outlookSource.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-app-border bg-app-input text-gray-700 dark:text-gray-200 hover:bg-app-surface transition-colors disabled:opacity-60 disabled:cursor-wait"
                  >
                    <RefreshCw size={12} className={syncOutlook.isPending ? "animate-spin" : ""} />
                    {syncOutlook.isPending ? t("syncing_outlook") : t("sync_now")}
                  </button>
                  <button
                    type="button"
                    disabled={disconnectSource.isPending}
                    onClick={() => handleDisconnectOutlook(outlookSource.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 dark:border-red-700 bg-white dark:bg-gray-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-60 disabled:cursor-wait"
                  >
                    <Unlink size={12} />
                    {disconnectSource.isPending ? t("disconnecting") : t("disconnect")}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={outlookInit.isPending}
                onClick={handleConnectOutlook}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-app-input border border-app-border text-gray-700 dark:text-gray-200 hover:bg-app-surface transition-colors disabled:opacity-60 disabled:cursor-wait shadow-sm"
              >
                {/* Microsoft icon */}
                <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="none">
                  <rect x="1"  y="1"  width="10" height="10" fill="#F25022" />
                  <rect x="13" y="1"  width="10" height="10" fill="#7FBA00" />
                  <rect x="1"  y="13" width="10" height="10" fill="#00A4EF" />
                  <rect x="13" y="13" width="10" height="10" fill="#FFB900" />
                </svg>
                {outlookInit.isPending ? t("connecting_outlook") : t("connect_outlook")}
              </button>
            )}
          </FieldRow>
        </Section>

      </div>
    </div>
  );
}
