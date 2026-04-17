"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCalendar } from "@/contexts/CalendarContext";
import { useRouter, usePathname } from "next/navigation";

const DAY_HEADERS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Build a 6×7 grid (always 42 cells) for the given month, week starts Monday */
function buildGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  // Monday = 0 … Sunday = 6
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length < 42) cells.push(null);
  return cells;
}

export function MiniCalendar() {
  const { goToDate, changeView, currentDate } = useCalendar();
  const router   = useRouter();
  const pathname = usePathname();
  const today    = new Date();

  // Mini calendar's own month view (starts at today's month)
  const [viewYear,  setViewYear]  = useState(() => today.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => today.getMonth());

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  }

  function handleDayClick(date: Date) {
    // Keep the mini calendar's displayed month in sync with the clicked date
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());

    if (pathname !== "/calendar") {
      // If the user is on Settings (or any other page), navigate to the
      // calendar first; the CalendarView will mount and register its ref,
      // then the context calls will take effect once the view is ready.
      router.push("/calendar");
      // goToDate / changeView are no-ops until the CalendarView mounts,
      // so we rely on the default initialView ("dayGridMonth") for now.
      return;
    }

    // Navigate the main FullCalendar to this exact date while preserving
    // whatever view is currently active (month → correct month,
    // week → week containing this date, day → this exact day).
    goToDate(date);
  }

  const grid = buildGrid(viewYear, viewMonth);

  return (
    <div className="px-3 py-2 select-none">
      {/* Month / year header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={prevMonth}
          className="p-1 rounded hover:bg-app-surface text-gray-500 dark:text-gray-400 transition-colors"
        >
          <ChevronLeft size={14} />
        </button>
        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
          {MONTH_NAMES[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="p-1 rounded hover:bg-app-surface text-gray-500 dark:text-gray-400 transition-colors"
        >
          <ChevronRight size={14} />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-0.5">
        {DAY_HEADERS.map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-gray-400 dark:text-gray-500 py-0.5">
            {d}
          </div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7">
        {grid.map((date, i) => {
          if (!date) return <div key={i} />;

          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, currentDate);
          const isCurrentMonth = date.getMonth() === viewMonth;

          return (
            <button
              key={i}
              onClick={() => handleDayClick(date)}
              className={`
                flex items-center justify-center rounded-full text-[11px] w-6 h-6 mx-auto my-0.5 transition-colors
                ${isToday
                  ? "bg-[#C8750A] text-white font-bold"
                  : isSelected && !isToday
                  ? "bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 font-semibold"
                  : isCurrentMonth
                  ? "text-gray-700 dark:text-gray-200 hover:bg-app-surface"
                  : "text-gray-300 dark:text-gray-600 hover:bg-app-surface"
                }
              `}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
