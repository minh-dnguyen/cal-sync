"use client";

import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import {
  Plus, ChevronDown, ChevronUp,
  Settings, Calendar, Cake, CheckSquare, Globe,
} from "lucide-react";
import api from "@/lib/api";
import { CalendarSource } from "@/types";
import { MiniCalendar } from "@/components/calendar/MiniCalendar";
import { useAuth } from "@/hooks/useAuth";
import { useSettingsStore } from "@/store/settingsStore";
import { useUiStore } from "@/store/uiStore";
import { useSyncHolidays } from "@/hooks/useEvents";

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
      <div className="flex rounded-2xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
        {/* Main "Create" area */}
        <button
          onClick={handleEvent}
          className="flex items-center gap-2 flex-1 px-4 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors text-sm font-semibold text-gray-800 dark:text-gray-100"
        >
          <Plus size={16} className="text-primary-500 flex-shrink-0" />
          {t("create")}
        </button>
        {/* Dropdown arrow */}
        <button
          onClick={() => setDropOpen((v) => !v)}
          className="px-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/60 border-l border-gray-200 dark:border-gray-700 transition-colors text-gray-400 dark:text-gray-500"
          aria-label={t("create")}
        >
          <ChevronDown size={14} className={`transition-transform ${dropOpen ? "rotate-180" : ""}`} />
        </button>
      </div>

      {dropOpen && (
        <div className="absolute left-3 right-3 top-full mt-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg overflow-hidden z-50">
          <button
            onClick={handleEvent}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <Calendar size={14} className="text-primary-500" /> {t("event")}
          </button>
          <button
            disabled
            title="Coming in Phase 4"
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed border-t border-gray-100 dark:border-gray-700"
          >
            <CheckSquare size={14} className="opacity-40" /> {t("task")}
            <span className="ml-auto text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 px-1.5 py-0.5 rounded-full">{t("soon")}</span>
          </button>
          <button
            disabled
            title="Coming in Phase 4"
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-400 dark:text-gray-600 cursor-not-allowed border-t border-gray-100 dark:border-gray-700"
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
          : "hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
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
      <div className="border-b border-gray-100 dark:border-gray-700 pb-2">
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
              <CalRow
                key={src.id}
                label={src.name}
                sub={src.source_type === "holiday" ? t("public_holidays") : src.source_type}
                color={src.color}
                checked={src.is_visible}
                onChange={(v) => toggleVisibility.mutate({ id: src.id, is_visible: v })}
              />
            ))}

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
                    : "hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer"
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
      <div className="p-3 border-t border-gray-100 dark:border-gray-700">
        <Link
          href="/settings"
          onClick={onClose}
          className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm transition-colors ${
            pathname === "/settings"
              ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium"
              : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-700 dark:hover:text-gray-200"
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
      <aside className={`${open ? "flex" : "hidden"} flex-col w-64 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900`}>
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
          <aside className="relative w-72 bg-white dark:bg-gray-900 flex flex-col shadow-xl overflow-hidden">
            {content}
          </aside>
        </div>
      )}
    </>
  );
}
