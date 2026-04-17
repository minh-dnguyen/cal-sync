import { CalEvent, CalendarSource, FcEvent } from "@/types";

/** Convert a backend event to a FullCalendar event object */
export function toFcEvent(event: CalEvent, sources: CalendarSource[]): FcEvent {
  const source = sources.find((s) => s.id === event.calendar_source_id);
  const color = event.color ?? source?.color ?? "#6366F1";

  const fc: FcEvent = {
    id: event.id,
    title: event.title,
    start: event.start_time,
    end: event.end_time,
    allDay: event.all_day,
    backgroundColor: color,
    borderColor: color,
    extendedProps: {
      description: event.description,
      source: event.source,
      reminder_minutes: event.reminder_minutes,
      calendar_source_id: event.calendar_source_id,
      color: event.color,
    },
  };

  if (event.rrule) {
    fc.rrule = event.rrule;
  }

  return fc;
}

/** Build an RFC 5545 RRULE string from simple form values */
export function buildRrule(
  freq: string,
  interval: number,
  byDay?: string[],
  until?: string,
  byMonthDay?: number | null,
): string | undefined {
  if (freq === "none") return undefined;

  let rule = `FREQ=${freq.toUpperCase()};INTERVAL=${interval}`;

  // BYMONTHDAY takes precedence for monthly recurrence ("on day X of month")
  if (byMonthDay && freq === "monthly") {
    rule += `;BYMONTHDAY=${byMonthDay}`;
  } else if (byDay && byDay.length > 0) {
    rule += `;BYDAY=${byDay.join(",")}`;
  }

  if (until) {
    // Convert "YYYY-MM-DD" to RFC 5545 format: 20240101T000000Z
    rule += `;UNTIL=${until.replace(/-/g, "")}T000000Z`;
  }

  return rule;
}

export interface ParsedRrule {
  freq: string;
  interval: number;
  byDay: string[];
  /** YYYY-MM-DD end date, or empty string if none */
  until: string;
  /** Day-of-month for BYMONTHDAY (1-31), or null if not set */
  byMonthDay: number | null;
}

/** Parse an RFC 5545 RRULE string back to form values (best-effort for display) */
export function parseRrule(rrule: string | null): ParsedRrule {
  if (!rrule)
    return {
      freq: "none",
      interval: 1,
      byDay: [],
      until: "",
      byMonthDay: null,
    };

  const parts = Object.fromEntries(
    rrule.split(";").map((p) => {
      const [k, v] = p.split("=");
      return [k, v];
    }),
  );

  // Convert "20240101T000000Z" → "2024-01-01"
  let until = "";
  if (parts["UNTIL"]) {
    const raw = parts["UNTIL"].replace(/T.*$/, ""); // strip time portion
    until = `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
  }

  return {
    freq: (parts["FREQ"] ?? "NONE").toLowerCase(),
    interval: parseInt(parts["INTERVAL"] ?? "1", 10),
    byDay: parts["BYDAY"] ? parts["BYDAY"].split(",") : [],
    until,
    byMonthDay: parts["BYMONTHDAY"] ? parseInt(parts["BYMONTHDAY"], 10) : null,
  };
}

/** Format a datetime-local input value to ISO 8601 with timezone offset */
export function localInputToISO(value: string, tz: string): string {
  // For now send as-is; the backend stores with timezone info
  return new Date(value).toISOString();
}

/** Format an ISO date string for datetime-local input */
export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Detect the user's country code from browser locale (best effort) */
export function detectCountryCode(): string {
  if (typeof navigator === "undefined") return "US";
  const locale = navigator.language || "en-US";
  const parts = locale.split("-");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "US";
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}
