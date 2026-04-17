"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Plus, ChevronDown, ChevronUp,
  Settings, Calendar, Cake, CheckSquare, Globe, RefreshCw,
} from "lucide-react";
import api from "@/lib/api";
import { CalendarSource } from "@/types";
import { MiniCalendar } from "@/components/calendar/MiniCalendar";
import { useAuth } from "@/hooks/useAuth";
import { useSettingsStore } from "@/store/settingsStore";
import { useUiStore } from "@/store/uiStore";
import { useSyncHolidays, useSyncGoogleCalendar, useGoogleInit } from "@/hooks/useEvents";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

// ── Create button dropdown ────────────────────────────────────────────────────

function CreateButton({ onClose }: { onClose?: () => void }) {
  const { t } = useTranslation();
  const [dropOpen, setDropOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerNewEvent = useUiStore((s) => s.triggerNewEvent);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setDropOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  function handleEvent() {
    setDropOpen(false);
    onClose?.();
    triggerNewEvent();
  }

  return (
    <div className="relative px-3 pt-3 pb-2" ref={ref}>
      <div className="flex rounded-2xl shadow-sm overflow-hidden border border-app-border">
        {/* Main "Create" area */}
        <button
          onClick={handleEvent}
          className="flex items-center gap-2 flex-1 px-4 py-2.5 bg-app-surface hover:bg-app-surface transition-colors text-sm font-semibold text-gray-800 dark:text-gray-100"
        >
          <Plus size={16} className="text-primary-500 flex-shrink-0" />
          {t("create")}
        </button>
        {/* Dropdown arrow */}
        <button
          onClick={() => setDropOpen((v) => !v)}
          className="px-2.5 bg-app-surface hover:bg-app-surface border-l border-app-border transition-colors text-gray-400 dark:text-gray-500"
          aria-label={t("create")}
        >
          <ChevronDown size={14} className={`transition-transform ${dropOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {dropOpen && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-app-surface rounded-xl border border-app-border shadow-lg overflow-hidden z-50">
          <button
            onClick={handleEvent}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <Calendar size={14} className="text-primary-500" /> {t("event")}
          </button>
          <button
            disabled
            title="Coming in Phase 4"
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed border-t border-app-border"
          >
            <CheckSquare size={14} className="opacity-40" /> {t("task")}
            <span className="ml-auto text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded-full">{t("soon")}</span>
          </button>
          <button
            disabled
            title="Coming in Phase 4"
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed border-t border-app-border"
          >
            <Calendar size={14} className="opacity-40" /> {t("appointment")}
            <span className="ml-auto text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded-full">{t("soon")}</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Collapsible section header ────────────────────────────────────────────────

function SectionHeader({
  label,
  expanded,
  onToggle,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center justify-between w-full px-3 py-1.5 group"
    >
      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors">
        {label}
      </span>
      {expanded
        ? <ChevronUp size={13} className="text-gray-400" />
        : <ChevronDown size={13} className="text-gray-400" />}
    </button>
  );
}

// ── Calendar checkbox row ─────────────────────────────────────────────────────

function CalRow({
  label,
  sub,
  color,
  checked,
  onChange,
  disabled,
  badge,
}: {
  label: string;
  sub?: string;
  color: string;
  checked: boolean;
  onChange?: (v: boolean) => void;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <label
      className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-colors ${
        disabled
          ? "opacity-50 cursor-not-allowed"
          : "hover:bg-app-surface cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange?.(e.target.checked)}
        className="sr-only"
      />
      {/* Custom checkbox */}
      <span
        className="w-3.5 h-3.5 rounded-sm flex items-center justify-center flex-shrink-0 border-2 transition-colors"
        style={{
          backgroundColor: checked ? color : "transparent",
          borderColor: color,
        }}
      >
        {checked && (
          <svg className="w-2 h-2 text-white" fill="none" viewBox="0 0 10 10">
            <path d="M1.5 5L4 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate leading-snug">{label}</p>
        {sub && <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">{sub}</p>}
      </div>
      {badge && (
        <span className="text-[9px] font-semibold bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded-full flex-shrink-0">
          {badge}
        </span>
      )}
    </label>
  );
}

// ── Main Sidebar ──────────────────────────────────────────────────────────────

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const pathname = usePathname();
  const { user } = useAuth();
  const { region } = useSettingsStore();

  const [myCalOpen, setMyCalOpen]    = useState(true);
  const [otherCalOpen, setOtherCalOpen] = useState(true);
  const [syncError, setSyncError] = useState(false);

  const { data: sources = [] } = useQuery<CalendarSource[]>({
    queryKey: ["calendar-sources"],
    queryFn: () => api.get("/api/v1/calendar-sources").then((r) => r.data),
  });

  const toggleVisibility = useMutation({
    mutationFn: ({ id, is_visible }: { id: string; is_visible: boolean }) =>
      api.patch(`/api/v1/calendar-sources/${id}`, { is_visible }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["calendar-sources"] }),
  });

  const syncHolidays = useSyncHolidays();
  const syncGoogle = useSyncGoogleCalendar();
  const googleInit = useGoogleInit();
  const googleSource = sources.find((s) => s.source_type === "google");

  // Split sources by type
  const localSources   = sources.filter((s) => s.source_type === "local");
  const otherSources   = sources.filter((s) => s.source_type !== "local");
  const holidaySource  = sources.find((s) => s.source_type === "holiday");

  // User display name for the main calendar label
  const userName = user?.full_name ?? user?.email ?? "My Calendar";

  // Region label for holiday calendar
  const REGION_NAMES: Record<string, string> = {
    US: "United States", VN: "Vietnam", GB: "United Kingdom", DE: "Germany",
    FR: "France", JP: "Japan", KR: "South Korea", CN: "China", IN: "India",
    BR: "Brazil", AU: "Australia", CA: "Canada", RU: "Russia",
  };
  const regionName = REGION_NAMES[region] ?? region;

  const content = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Create button */}
      <CreateButton onClose={onClose} />

      {/* Mini calendar */}
      <div className="border-b border-app-border pb-2">
        <MiniCalendar />
      </div>

      {/* Calendar lists */}
      <div className="flex-1 overflow-y-auto py-2 space-y-1">

        {/* ── My Calendars ─────────────────────────────────────── */}
        <SectionHeader
          label={t("my_calendars")}
          expanded={myCalOpen}
          onToggle={() => setMyCalOpen((v) => !v)}
        />

        {myCalOpen && (
          <div className="space-y-0.5">
            {/* Personal (local) sources from API — first one is labelled with user's name */}
            {localSources.map((src, idx) => (
              <CalRow
                key={src.id}
                label={idx === 0 ? userName : src.name}
                sub={idx === 0 ? src.name : undefined}
                color={src.color}
                checked={src.is_visible}
                onChange={(v) => toggleVisibility.mutate({ id: src.id, is_visible: v })}
              />
            ))}
            {/* Birthdays — Phase 2 placeholder */}
            <CalRow
              label={t("birthdays")}
              color="#16A34A"
              checked={false}
              disabled
              badge={t("soon")}
            />
            {/* Tasks — Phase 4 placeholder */}
            <CalRow
              label={t("tasks")}
              color="#0891B2"
              checked={false}
              disabled
              badge={t("soon")}
            />
          </div>
        )}

        {/* ── Other Calendars ──────────────────────────────────── */}
        <div className="pt-1">
          <SectionHeader
            label={t("other_calendars")}
            expanded={otherCalOpen}
            onToggle={() => setOtherCalOpen((v) => !v)}
          />
        </div>

        {otherCalOpen && (
          <div className="space-y-0.5">
            {/* Any google / outlook / holiday sources from API */}
            {otherSources.map((src) => (
              <div key={src.id} className="group relative">
                <CalRow
                  label={src.name}
                  sub={
                    src.source_type === "holiday"
                      ? t("public_holidays")
                      : src.connected_email ?? src.source_type
                  }
                  color={src.color}
                  checked={src.is_visible}
                  onChange={(v) => toggleVisibility.mutate({ id: src.id, is_visible: v })}
                />
                {src.source_type === "google" && (
                  <button
                    type="button"
                    title={t("sync_now")}
                    disabled={syncGoogle.isPending}
                    onClick={() => syncGoogle.mutate(src.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded text-gray-400 hover:text-primary-500 disabled:cursor-wait"
                  >
                    <RefreshCw
                      size={12}
                      className={syncGoogle.isPending ? "animate-spin" : ""}
                    />
                  </button>
                )}
              </div>
            ))}

            {/* "Connect Google" button — shown only when not yet connected */}
            {!googleSource && (
              <button
                type="button"
                disabled={googleInit.isPending}
                onClick={() => {
                  googleInit.mutate(undefined, {
                    onSuccess: (authUrl) => { window.location.href = authUrl; },
                  });
                }}
                className={`flex items-center gap-2.5 px-3 py-1.5 w-full rounded-lg transition-colors text-left ${
                  googleInit.isPending
                    ? "opacity-60 cursor-wait"
                    : "hover:bg-app-surface cursor-pointer"
                }`}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate leading-snug">
                    {googleInit.isPending ? t("connecting_google") : t("connect_google")}
                  </p>
                </div>
              </button>
            )}

            {/* "Add holidays" button — shown only when no holiday source is synced yet */}
            {!holidaySource && (
              <button
                type="button"
                disabled={syncHolidays.isPending}
                onClick={() => {
                  setSyncError(false);
                  syncHolidays.mutate(region, {
                    onError: () => setSyncError(true),
                  });
                }}
                className={`flex items-center gap-2.5 px-3 py-1.5 w-full rounded-lg transition-colors text-left ${
                  syncHolidays.isPending
                    ? "opacity-60 cursor-wait"
                    : "hover:bg-app-surface cursor-pointer"
                }`}
              >
                <Globe
                  size={13}
                  className={`flex-shrink-0 ${syncHolidays.isPending ? "animate-spin" : "text-red-400"}`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-700 dark:text-gray-200 truncate leading-snug">
                    {syncHolidays.isPending ? t("syncing_holidays") : t("add_holidays")}
                  </p>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                    {syncError ? t("holiday_sync_error") : t("holidays_in", { region: regionName })}
                  </p>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div className="p-3 border-t border-app-border">
        <Link
          href="/settings"
          onClick={onClose}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === "/settings"
              ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium"
              : "text-gray-500 dark:text-gray-400 hover:bg-app-surface hover:text-gray-700 dark:hover:text-gray-200"
          }`}
        >
          <Settings size={14} />
          {t("settings")}
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop — toggled by the hamburger on all screen sizes */}
      <aside className={`${open ? "flex" : "hidden"} flex-col w-64 flex-shrink-0 border-r border-app-border bg-app-bg`}>
        {content}
      </aside>

      {/* Mobile drawer — sits BELOW the header, never covers it */}
      {open && (
        <div
          className="fixed inset-x-0 bottom-0 z-40 flex lg:hidden"
          style={{ top: "var(--header-height)" }}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          {/* Panel */}
          <aside className="relative w-72 bg-app-bg flex flex-col shadow-xl overflow-hidden">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
