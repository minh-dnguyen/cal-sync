"use client";

import { Menu, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ProfileMenu } from "@/components/ui/ProfileMenu";
import { useCalendar } from "@/contexts/CalendarContext";

interface HeaderProps {
  onMenuToggle: () => void;
}

/** ISO week number (Monday-based) */
function getISOWeek(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function Header({ onMenuToggle }: HeaderProps) {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const router   = useRouter();
  const { goToday, goPrev, goNext, changeView, view, currentDate } = useCalendar();

  const isSettings = pathname === "/settings";

  const VIEW_OPTIONS = [
    { key: "dayGridMonth", label: t("month") },
    { key: "timeGridWeek", label: t("week") },
    { key: "timeGridDay",  label: t("day") },
  ];

  const weekNum   = getISOWeek(currentDate);
  const dateLabel = currentDate.toLocaleString(i18n.language, { month: "long", year: "numeric" });
  const weekLabel = t("week") + " " + weekNum;

  return (
    <header className="relative z-50 h-14 flex items-center gap-2 px-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex-shrink-0">
      {/* ── Left cluster ───────────────────────────────────────── */}

      {isSettings ? (
        /* Settings page — back arrow replaces the hamburger */
        <button
          onClick={() => router.push("/calendar")}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          aria-label="Back to calendar"
        >
          <ArrowLeft size={20} />
        </button>
      ) : (
        /* All other pages — hamburger toggles the sidebar */
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Logo — click to go home */}
      <Link
        href="/calendar"
        className="flex items-center gap-1.5 font-bold text-primary-600 dark:text-primary-400 text-base mr-1 flex-shrink-0 hover:opacity-80 transition-opacity"
      >
        <span className="w-7 h-7 rounded-lg bg-primary-500 text-white text-sm font-bold flex items-center justify-center">
          C
        </span>
        <span className="hidden md:inline">CalSync</span>
      </Link>

      {/* Calendar navigation — hidden on the settings page */}
      {!isSettings && (
        <>
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            {t("today")}
          </button>

          <div className="flex items-center gap-0.5">
            <button
              onClick={goPrev}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goNext}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap truncate">
              {dateLabel}
            </span>
            <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
              {weekLabel}
            </span>
          </div>
        </>
      )}

      <div className="flex-1" />

      {/* ── Right cluster ──────────────────────────────────────── */}

      {/* View switcher — hidden on the settings page */}
      {!isSettings && (
        <div className="hidden sm:flex items-center rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden flex-shrink-0">
          {VIEW_OPTIONS.map((opt, idx) => (
            <button
              key={opt.key}
              onClick={() => changeView(opt.key)}
              className={`px-3 py-1.5 text-xs font-medium transition-colors
                ${idx > 0 ? "border-l border-gray-200 dark:border-gray-700" : ""}
                ${view === opt.key
                  ? "bg-primary-500 text-white"
                  : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      <ThemeToggle variant="compact" />
      <ProfileMenu />
    </header>
  );
}
