"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Trash2, Bell, RefreshCw, Palette, AlignLeft } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useCreateEvent, useUpdateEvent, useDeleteEvent } from "@/hooks/useEvents";
import { buildRrule, parseRrule, isoToLocalInput, ParsedRrule } from "@/lib/utils";
import { CalEvent, CalendarSource, EventCreate, EventUpdate } from "@/types";
import api from "@/lib/api";

const EVENT_COLORS = [
  "#6366F1", "#8B5CF6", "#EC4899", "#EF4444",
  "#F97316", "#EAB308", "#22C55E", "#06B6D4", "#3B82F6",
];

interface Props {
  open: boolean;
  onClose: () => void;
  // If provided, we're editing an existing event
  event?: CalEvent | null;
  // Pre-fill start/end when clicking a blank slot
  defaultStart?: string;
  defaultEnd?: string;
}

export function EventModal({ open, onClose, event, defaultStart, defaultEnd }: Props) {
  const { t } = useTranslation();
  const isEditing = !!event;

  const FREQ_OPTIONS = [
    { value: "none",    label: t("does_not_repeat") },
    { value: "daily",   label: t("daily") },
    { value: "weekly",  label: t("weekly") },
    { value: "monthly", label: t("monthly") },
    { value: "yearly",  label: t("yearly") },
  ];

  const DAYS = [
    { value: "MO", label: t("mon") },
    { value: "TU", label: t("tue") },
    { value: "WE", label: t("wed") },
    { value: "TH", label: t("thu") },
    { value: "FR", label: t("fri") },
    { value: "SA", label: t("sat") },
    { value: "SU", label: t("sun") },
  ];

  const REMINDER_OPTIONS = [
    { value: "",     label: t("no_reminder") },
    { value: "5",    label: t("min5_before") },
    { value: "10",   label: t("min10_before") },
    { value: "15",   label: t("min15_before") },
    { value: "30",   label: t("min30_before") },
    { value: "60",   label: t("hour1_before") },
    { value: "1440", label: t("day1_before") },
  ];

  const { data: sources = [] } = useQuery<CalendarSource[]>({
    queryKey: ["calendar-sources"],
    queryFn: () => api.get("/api/v1/calendar-sources").then((r) => r.data),
    enabled: open,
  });

  const localSource = sources.find((s) => s.source_type === "local");

  // ── Form state ──────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState(EVENT_COLORS[0]);
  const [calendarSourceId, setCalendarSourceId] = useState<string>("");
  const [reminderMinutes, setReminderMinutes] = useState<string>("");

  // Recurrence state
  const [freq, setFreq] = useState("none");
  const [interval, setInterval] = useState(1);
  const [byDay, setByDay] = useState<string[]>([]);
  const [until, setUntil] = useState("");
  // For monthly: "day" = BYMONTHDAY (e.g. every 15th), "week" = BYDAY (default)
  const [monthlyMode, setMonthlyMode] = useState<"day" | "week">("day");
  const [byMonthDay, setByMonthDay] = useState<number | null>(null);

  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

  // Populate form when opening
  useEffect(() => {
    if (!open) return;

    if (event) {
      setTitle(event.title);
      setDescription(event.description ?? "");
      setStartInput(isoToLocalInput(event.start_time));
      setEndInput(isoToLocalInput(event.end_time));
      setAllDay(event.all_day);
      setColor(event.color ?? EVENT_COLORS[0]);
      setCalendarSourceId(event.calendar_source_id ?? localSource?.id ?? "");
      setReminderMinutes(event.reminder_minutes ? String(event.reminder_minutes) : "");

      const parsed: ParsedRrule = parseRrule(event.rrule);
      setFreq(parsed.freq);
      setInterval(parsed.interval);
      setByDay(parsed.byDay);
      setUntil(parsed.until);
      if (parsed.freq === "monthly" && parsed.byMonthDay !== null) {
        setMonthlyMode("day");
        setByMonthDay(parsed.byMonthDay);
      } else if (parsed.freq === "monthly") {
        setMonthlyMode("week");
        setByMonthDay(null);
      } else {
        setMonthlyMode("day");
        setByMonthDay(null);
      }
    } else {
      // New event defaults
      const now = new Date();
      const start = defaultStart ?? new Date(now.setMinutes(0, 0, 0)).toISOString();
      const end = defaultEnd ?? new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();
      setTitle("");
      setDescription("");
      setStartInput(isoToLocalInput(start));
      setEndInput(isoToLocalInput(end));
      setAllDay(false);
      setColor(EVENT_COLORS[0]);
      setCalendarSourceId(localSource?.id ?? "");
      setReminderMinutes("");
      setFreq("none");
      setInterval(1);
      setByDay([]);
      setUntil("");
      setMonthlyMode("day");
      setByMonthDay(null);
    }
  }, [open, event, defaultStart, defaultEnd, localSource?.id]);

  function toggleDay(d: string) {
    setByDay((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // For monthly "on day X" mode derive BYMONTHDAY from startInput if not explicitly set
    const effectiveByMonthDay =
      freq === "monthly" && monthlyMode === "day"
        ? byMonthDay ?? new Date(startInput).getDate()
        : null;
    const rruleStr = buildRrule(freq, interval, byDay, until, effectiveByMonthDay);

    const payload: EventCreate | EventUpdate = {
      title,
      description: description || undefined,
      start_time: new Date(startInput).toISOString(),
      end_time: new Date(endInput).toISOString(),
      all_day: allDay,
      color,
      rrule: rruleStr,
      reminder_minutes: reminderMinutes ? parseInt(reminderMinutes) : undefined,
      calendar_source_id: calendarSourceId || undefined,
    };

    try {
      if (isEditing) {
        await updateEvent.mutateAsync({ id: event!.id, body: payload });
      } else {
        await createEvent.mutateAsync(payload as EventCreate);
      }
      onClose();
    } catch {
      // Errors surfaced via mutation state if needed
    }
  }

  async function handleDelete() {
    if (!event) return;
    if (!confirm(t("delete_confirm", { title: event.title }))) return;
    await deleteEvent.mutateAsync(event.id);
    onClose();
  }

  const inputClass =
    "w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent";

  const labelClass = "block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1";

  const isPending = createEvent.isPending || updateEvent.isPending;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? t("edit_event") : t("new_event")}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder={t("event_title")}
          className="w-full px-3 py-2.5 text-base font-medium rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />

        {/* All-day toggle */}
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
          <div
            onClick={() => setAllDay((v) => !v)}
            className={`w-9 h-5 rounded-full transition-colors ${allDay ? "bg-primary-500" : "bg-gray-300 dark:bg-gray-600"} relative flex-shrink-0 cursor-pointer`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${allDay ? "translate-x-4" : ""}`}
            />
          </div>
          {t("all_day")}
        </label>

        {/* Date/time */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>{t("start")}</label>
            <input
              type={allDay ? "date" : "datetime-local"}
              value={allDay ? startInput.split("T")[0] : startInput}
              onChange={(e) => setStartInput(allDay ? e.target.value + "T00:00" : e.target.value)}
              required
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>{t("end")}</label>
            <input
              type={allDay ? "date" : "datetime-local"}
              value={allDay ? endInput.split("T")[0] : endInput}
              onChange={(e) => setEndInput(allDay ? e.target.value + "T23:59" : e.target.value)}
              required
              className={inputClass}
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className={labelClass}>
            <span className="flex items-center gap-1.5"><AlignLeft size={12} /> {t("description")}</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t("add_description")}
            className={`${inputClass} resize-none`}
          />
        </div>

        {/* Recurrence */}
        <div>
          <label className={labelClass}>
            <span className="flex items-center gap-1.5"><RefreshCw size={12} /> {t("recurrence")}</span>
          </label>
          <select
            value={freq}
            onChange={(e) => {
              const next = e.target.value;
              setFreq(next);
              // When switching to monthly, default to "on day X" using start date
              if (next === "monthly") {
                setMonthlyMode("day");
                setByMonthDay(new Date(startInput).getDate() || null);
              }
            }}
            className={inputClass}
          >
            {FREQ_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {freq !== "none" && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">{t("repeat_every")}</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={interval}
                  onChange={(e) => setInterval(Math.max(1, parseInt(e.target.value) || 1))}
                  className={`${inputClass} w-16`}
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {freq === "daily" ? t("day_s") : freq === "weekly" ? t("week_s") : freq === "monthly" ? t("month_s") : t("year_s")}
                </span>
              </div>

              {freq === "weekly" && (
                <div className="flex flex-wrap gap-1.5">
                  {DAYS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        byDay.includes(d.value)
                          ? "bg-primary-500 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              )}

              {freq === "monthly" && (
                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setMonthlyMode("day");
                      setByMonthDay(new Date(startInput).getDate() || null);
                    }}
                    className={`flex-1 py-1.5 font-medium transition-colors ${
                      monthlyMode === "day"
                        ? "bg-primary-500 text-white"
                        : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {t("on_day_of_month", { day: byMonthDay ?? new Date(startInput).getDate() })}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setMonthlyMode("week"); setByMonthDay(null); }}
                    className={`flex-1 py-1.5 font-medium transition-colors border-l border-gray-200 dark:border-gray-600 ${
                      monthlyMode === "week"
                        ? "bg-primary-500 text-white"
                        : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {t("weekly")}
                  </button>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400">{t("end_date_opt")}</label>
                <input
                  type="date"
                  value={until}
                  onChange={(e) => setUntil(e.target.value)}
                  className={`${inputClass} mt-1`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Reminder */}
        <div>
          <label className={labelClass}>
            <span className="flex items-center gap-1.5"><Bell size={12} /> {t("reminder")}</span>
          </label>
          <select
            value={reminderMinutes}
            onChange={(e) => setReminderMinutes(e.target.value)}
            className={inputClass}
          >
            {REMINDER_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Color picker */}
        <div>
          <label className={labelClass}>
            <span className="flex items-center gap-1.5"><Palette size={12} /> {t("color")}</span>
          </label>
          <div className="flex flex-wrap gap-2 mt-1">
            {EVENT_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                className={`w-7 h-7 rounded-full transition-transform ${color === c ? "ring-2 ring-offset-2 ring-gray-400 dark:ring-gray-500 scale-110" : "hover:scale-105"}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Calendar */}
        {sources.length > 1 && (
          <div>
            <label className={labelClass}>{t("calendar")}</label>
            <select
              value={calendarSourceId}
              onChange={(e) => setCalendarSourceId(e.target.value)}
              className={inputClass}
            >
              {sources
                .filter((s) => s.source_type === "local")
                .map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
            </select>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleteEvent.isPending}
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
              title="Delete event"
            >
              <Trash2 size={16} />
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2 text-sm font-semibold bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white rounded-lg transition-colors"
          >
            {isPending ? t("saving") : isEditing ? t("save_changes") : t("create_event")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
