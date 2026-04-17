"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronDown, Sun, LayoutGrid, CalendarRange, AlignJustify } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useCalendar } from "@/contexts/CalendarContext";

const VIEW_OPTIONS = [
  { key: "timeGridDay",    icon: Sun,           labelKey: "day"      },
  { key: "dayGridMonth",   icon: LayoutGrid,    labelKey: "month"    },
  { key: "multiMonthYear", icon: CalendarRange, labelKey: "year"     },
  { key: "listYear",       icon: AlignJustify,  labelKey: "schedule" },
] as const;

export function ViewSwitcherMenu() {
  const { t } = useTranslation();
  const { view, changeView } = useCalendar();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  const current = VIEW_OPTIONS.find((v) => v.key === view) ?? VIEW_OPTIONS[1];

  return (
    <div className="relative flex-shrink-0" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-app-border text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        {t(current.labelKey)}
        <ChevronDown
          size={13}
          className={`text-gray-400 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-app-surface rounded-xl shadow-xl border border-app-border z-50 overflow-hidden py-1">
          {VIEW_OPTIONS.map(({ key, icon: Icon, labelKey }) => (
            <button
              key={key}
              role="option"
              aria-selected={view === key}
              onClick={() => { changeView(key); setOpen(false); }}
              className={`flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-colors
                ${view === key
                  ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-semibold"
                  : "text-gray-700 dark:text-gray-200 hover:bg-app-bg"
                }`}
            >
              <Icon size={14} className="flex-shrink-0" />
              {t(labelKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
