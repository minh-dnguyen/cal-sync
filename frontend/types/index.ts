export type Theme = "light" | "dark" | "system";
export type EventSource = "local" | "google" | "outlook" | "holiday";
export type SourceType = "local" | "google" | "outlook" | "holiday";

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  country_code: string | null;
  timezone: string;
  theme: Theme;
  created_at: string;
}

export interface CalendarSource {
  id: string;
  name: string;
  source_type: SourceType;
  is_visible: boolean;
  color: string;
  created_at: string;
}

export interface CalEvent {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean;
  color: string | null;
  rrule: string | null;
  source: EventSource;
  external_id: string | null;
  reminder_minutes: number | null;
  calendar_source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface EventCreate {
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  color?: string;
  rrule?: string;
  reminder_minutes?: number;
  calendar_source_id?: string;
}

export interface EventUpdate {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  color?: string;
  rrule?: string;
  reminder_minutes?: number;
  calendar_source_id?: string;
}

// FullCalendar event shape
export interface FcEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
  backgroundColor: string;
  borderColor: string;
  rrule?: string;
  extendedProps: {
    description: string | null;
    source: EventSource;
    reminder_minutes: number | null;
    calendar_source_id: string | null;
    color: string | null;
  };
}
