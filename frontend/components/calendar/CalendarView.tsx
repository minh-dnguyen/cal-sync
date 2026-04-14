"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import rrulePlugin from "@fullcalendar/rrule";
import "./timegrid.css";
import { useQuery } from "@tanstack/react-query";
import { useEvents } from "@/hooks/useEvents";
import { toFcEvent } from "@/lib/utils";
import { EventModal } from "./EventModal";
import { CalEvent, CalendarSource } from "@/types";
import api from "@/lib/api";
import type { DateSelectArg, EventClickArg, DatesSetArg } from "@fullcalendar/core";
import { useCalendar } from "@/contexts/CalendarContext";
import { useUiStore } from "@/store/uiStore";
import { useTranslation } from "react-i18next";

export function CalendarView() {
  const { t } = useTranslation();
  const calRef = useRef<FullCalendar | null>(null);
  const { registerCal, updateState } = useCalendar();

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [defaultStart, setDefaultStart] = useState<string | undefined>();
  const [defaultEnd, setDefaultEnd] = useState<string | undefined>();
  const [rangeStart, setRangeStart] = useState<string | undefined>();
  const [rangeEnd, setRangeEnd] = useState<string | undefined>();

  // Register this FullCalendar instance with the shared context
  useEffect(() => {
    registerCal(calRef.current);
    return () => registerCal(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open "new event" modal when triggered from the sidebar Create button
  const newEventTrigger = useUiStore((s) => s.newEventTrigger);
  useEffect(() => {
    if (newEventTrigger === 0) return;
    setSelectedEvent(null);
    setDefaultStart(undefined);
    setDefaultEnd(undefined);
    setModalOpen(true);
  }, [newEventTrigger]);

  // Fetch events in the visible date range
  const { data: events = [] } = useEvents(rangeStart, rangeEnd);

  // Fetch calendar sources for color mapping and visibility
  const { data: sources = [] } = useQuery<CalendarSource[]>({
    queryKey: ["calendar-sources"],
    queryFn: () => api.get("/api/v1/calendar-sources").then((r) => r.data),
  });

  const visibleSourceIds = new Set(sources.filter((s) => s.is_visible).map((s) => s.id));
  const visibleEvents = events.filter(
    (e) => !e.calendar_source_id || visibleSourceIds.has(e.calendar_source_id)
  );
  const fcEvents = visibleEvents.map((e) => toFcEvent(e, sources));

  const handleDatesSet = useCallback(
    (arg: DatesSetArg) => {
      setRangeStart(arg.start.toISOString());
      setRangeEnd(arg.end.toISOString());
      // Keep shared context in sync
      // Use currentStart (the viewed period's start), NOT arg.start
      // which is the first rendered cell and may fall in the previous month.
      updateState(arg.view.title, arg.view.type, arg.view.currentStart);
      // Re-register in case the ref was updated after the initial render
      if (calRef.current) registerCal(calRef.current);
    },
    [updateState, registerCal]
  );

  const handleDateSelect = useCallback((arg: DateSelectArg) => {
    setSelectedEvent(null);
    setDefaultStart(arg.startStr);
    setDefaultEnd(arg.endStr);
    setModalOpen(true);
    calRef.current?.getApi().unselect();
  }, []);

  const handleEventClick = useCallback(
    (arg: EventClickArg) => {
      const clicked = events.find((e) => e.id === arg.event.id);
      if (clicked) {
        setSelectedEvent(clicked);
        setDefaultStart(undefined);
        setDefaultEnd(undefined);
        setModalOpen(true);
      }
    },
    [events]
  );

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="flex-1 overflow-auto p-3 pt-2">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, rrulePlugin]}
          initialView="dayGridMonth"
          /* We provide our own toolbar in the Header */
          headerToolbar={false}
          height="100%"
          selectable
          selectMirror
          editable={false}
          events={fcEvents}
          datesSet={handleDatesSet}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDisplay="block"
          dayMaxEvents={4}
          nowIndicator
          weekends
          firstDay={1}
          /* ── TimeGrid (Week / Day) premium config ── */
          allDaySlot
          allDayText={t("all_day_label")}
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          slotLabelFormat={{ hour: "numeric", minute: "2-digit", omitZeroMinute: true, meridiem: "short" }}
          scrollTime={`${new Date().getHours().toString().padStart(2, "0")}:00:00`}
          eventMinHeight={24}
          slotEventOverlap={false}
          windowResize={() => {
            const api = calRef.current?.getApi();
            if (!api) return;
            if (window.innerWidth < 640) api.changeView("timeGridDay");
          }}
        />
      </div>

      {/* Mobile FAB */}
      <button
        onClick={() => {
          setSelectedEvent(null);
          setDefaultStart(undefined);
          setDefaultEnd(undefined);
          setModalOpen(true);
        }}
        className="sm:hidden fixed bottom-6 right-6 w-14 h-14 rounded-full bg-primary-500 hover:bg-primary-600 text-white text-3xl shadow-lg flex items-center justify-center z-30 transition-colors"
        title="New event"
      >
        +
      </button>

      <EventModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        event={selectedEvent}
        defaultStart={defaultStart}
        defaultEnd={defaultEnd}
      />
    </div>
  );
}
