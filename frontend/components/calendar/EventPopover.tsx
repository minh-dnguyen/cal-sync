"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Pencil, Trash2, Clock, AlignLeft, RefreshCw, Bell } from "lucide-react";
import { CalEvent, CalendarSource } from "@/types";
import { useSettingsStore } from "@/store/settingsStore";


interface Props {
  event: CalEvent;
  anchor: DOMRect;
  sources: CalendarSource[];
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const POPOVER_W = 280;
const GAP = 10;

function formatRange(start: string, end: string, allDay: boolean, hour12: boolean): string {
  const s = new Date(start);
  const e = new Date(end);
  const dateOpts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  const timeOpts: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit", hour12 };
  const fmt = (d: Date, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(undefined, o).format(d);
  const sameDay = s.toDateString() === e.toDateString();

  if (allDay) {
    if (sameDay) return fmt(s, dateOpts);
    const eAdj = new Date(e.getTime() - 86_400_000);
    return `${fmt(s, dateOpts)} – ${fmt(eAdj, dateOpts)}`;
  }
  if (sameDay) return `${fmt(s, dateOpts)}  ·  ${fmt(s, timeOpts)} – ${fmt(e, timeOpts)}`;
  return `${fmt(s, dateOpts)} ${fmt(s, timeOpts)} – ${fmt(e, dateOpts)} ${fmt(e, timeOpts)}`;
}

export function EventPopover({ event, anchor, sources, onClose, onEdit, onDelete }: Props) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const descRef = useRef<HTMLDivElement>(null);
  const timeFormat = useSettingsStore((s) => s.timeFormat);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pos, setPos] = useState({ left: -9999, top: -9999 });
  const [mounted, setMounted] = useState(false);

  const source = sources.find((s) => s.id === event.calendar_source_id);
  const color = event.color ?? source?.color ?? "#6366F1";
  const isLocal = event.source === "local";

  // Only render in browser
  useEffect(() => { setMounted(true); }, []);

  // Inject description HTML after mount — avoids all SSR/render-phase edge cases
  useEffect(() => {
    if (!descRef.current || !event.description) return;
    const div = descRef.current;
    div.innerHTML = event.description;
    // Sanitize in-place: strip scripts and dangerous attributes
    div.querySelectorAll("script,style,iframe,object,embed,form").forEach((el) => el.remove());
    div.querySelectorAll("*").forEach((el) => {
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.startsWith("on")) el.removeAttribute(attr.name);
        if (attr.name === "href" && /^javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
      });
      if (el.tagName === "A") {
        el.setAttribute("target", "_blank");
        el.setAttribute("rel", "noopener noreferrer");
      }
    });
  }, [event.description, mounted]);

  // Position after mount so we know the popover's own size
  useLayoutEffect(() => {
    if (!popoverRef.current) return;
    const ph = popoverRef.current.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = anchor.right + GAP;
    if (left + POPOVER_W > vw - 8) left = anchor.left - POPOVER_W - GAP;
    left = Math.max(8, Math.min(left, vw - POPOVER_W - 8));

    let top = anchor.top;
    top = Math.max(8, Math.min(top, vh - ph - 8));

    setPos({ left, top });
  }, [anchor]);

  // Close on outside mousedown
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    // Delay by one tick so the click that opened us doesn't immediately close us
    const id = setTimeout(() => document.addEventListener("mousedown", handle), 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener("mousedown", handle);
    };
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <div
      ref={popoverRef}
      style={{ position: "fixed", left: pos.left, top: pos.top, width: POPOVER_W, zIndex: 10001 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Color accent bar */}
      <div style={{ backgroundColor: color }} className="h-1.5 w-full" />

      <div className="px-4 pt-3 pb-2 space-y-2.5">
        {/* Title + close */}
        <div className="flex items-start gap-2">
          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1" style={{ backgroundColor: color }} />
          <h3 className="flex-1 font-semibold text-gray-900 dark:text-white text-sm leading-snug">
            {event.title}
          </h3>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-0.5 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Date / time */}
        <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
          <Clock size={12} className="flex-shrink-0 mt-0.5" />
          <span className="tabular-nums">
            {formatRange(event.start_time, event.end_time, event.all_day, timeFormat === "12h")}
          </span>
        </div>

        {/* Recurrence */}
        {event.rrule && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <RefreshCw size={12} className="flex-shrink-0" />
            <span>Repeating event</span>
          </div>
        )}

        {/* Reminder */}
        {event.reminder_minutes != null && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <Bell size={12} className="flex-shrink-0" />
            <span>{event.reminder_minutes} min before</span>
          </div>
        )}

        {/* Calendar source */}
        {source && (
          <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: source.color }} />
            <span>{source.name}</span>
          </div>
        )}

        {/* Description — innerHTML set via useEffect so HTML from Google/Outlook renders correctly */}
        {event.description && (
          <div className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
            <AlignLeft size={12} className="flex-shrink-0 mt-0.5" />
            <div
              ref={descRef}
              className="event-description overflow-hidden break-words"
              style={{ maxHeight: "6rem" }}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-100 dark:border-gray-700 px-3 py-2 flex items-center justify-end gap-1">
        {isLocal && !confirmDelete && (
          <>
            <button
              onClick={onEdit}
              title="Edit"
              className="p-1.5 rounded-lg text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button
              onClick={() => setConfirmDelete(true)}
              title="Delete"
              className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/20 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </>
        )}
        {isLocal && confirmDelete && (
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-red-500 flex-1">Delete this event?</span>
            <button
              onClick={onDelete}
              className="px-2.5 py-1 text-xs font-medium bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
