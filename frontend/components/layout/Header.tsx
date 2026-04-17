"use client";

import { Menu, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ProfileMenu } from "@/components/ui/ProfileMenu";
import { ViewSwitcherMenu } from "@/components/ui/ViewSwitcherMenu";
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
  const { goToday, goPrev, goNext, view, currentDate } = useCalendar();

  const isSettings  = pathname === "/settings";
  const isYearView  = view === "multiMonthYear";
  const isListView  = view === "listYear";
  const weekNum     = getISOWeek(currentDate);
  const dateLabel   = isYearView || isListView
    ? String(currentDate.getFullYear())
    : currentDate.toLocaleString(i18n.language, { month: "long", year: "numeric" });
  const weekLabel   = t("week") + " " + weekNum;

  return (
    <header className="relative z-50 h-14 flex items-center gap-2 px-3 border-b border-app-border bg-app-surface flex-shrink-0">
      {/* ── Left cluster ───────────────────────────────────────── */}

      {isSettings ? (
        /* Settings page — back arrow replaces the hamburger */
        <button
          onClick={() => router.push("/calendar")}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-app-surface transition-colors flex-shrink-0"
          aria-label="Back to calendar"
        >
          <ArrowLeft size={20} />
        </button>
      ) : (
        /* All other pages — hamburger toggles the sidebar */
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-app-surface transition-colors flex-shrink-0"
          aria-label="Toggle sidebar"
        >
          <Menu size={20} />
        </button>
      )}

      {/* Logo — click to go home */}
      <Link
        href="/calendar"
        className="flex items-center gap-1.5 font-bold text-[#1E293B] dark:text-primary-400 text-base mr-1 flex-shrink-0 hover:opacity-80 transition-opacity"
      >
        <span className="w-7 h-7 rounded-lg bg-[#6366F1] text-white text-sm font-bold flex items-center justify-center">
          C
        </span>
        <span className="hidden md:inline">CalSync</span>
      </Link>

      {/* Calendar navigation — hidden on the settings page */}
      {!isSettings && (
        <>
          <button
            onClick={goToday}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border bg-[#EEF2FF] border-[#6366F1] text-[#4F46E5] hover:bg-[#E0E7FF] dark:bg-transparent dark:border-[#818CF8] dark:text-[#818CF8] dark:hover:bg-[#818CF8]/10 transition-colors flex-shrink-0"
          >
            {t("today")}
          </button>

          <div className="flex items-center gap-0.5">
            <button
              onClick={goPrev}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-app-surface transition-colors"
              aria-label="Previous"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={goNext}
              className="p-1.5 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-app-surface transition-colors"
              aria-label="Next"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100 whitespace-nowrap truncate">
              {dateLabel}
            </span>
            {!isYearView && (
              <span className="hidden sm:inline text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                {weekLabel}
              </span>
            )}
          </div>
        </>
      )}

      <div className="flex-1" />

      {/* ── Right cluster ──────────────────────────────────────── */}

      {/* View switcher — hidden on the settings page */}
      {!isSettings && <ViewSwitcherMenu />}

      <ThemeToggle variant="toggle" />
      <ProfileMenu />
    </header>
  );
}
