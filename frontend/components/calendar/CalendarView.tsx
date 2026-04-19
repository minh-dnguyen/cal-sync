"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import multiMonthPlugin from "@fullcalendar/multimonth";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import rrulePlugin from "@fullcalendar/rrule";
import "./timegrid.css";
import { useQuery } from "@tanstack/react-query";
import { useEvents, useUpdateEvent, useDeleteEvent } from "@/hooks/useEvents";
import { toFcEvent } from "@/lib/utils";
import { EventModal } from "./EventModal";
import { EventPopover } from "./EventPopover";
import { CalEvent, CalendarSource } from "@/types";
import api from "@/lib/api";
import type { DateSelectArg, EventClickArg, DatesSetArg, EventHoveringArg, EventDropArg } from "@fullcalendar/core";
import type { EventResizeDoneArg } from "@fullcalendar/interaction";
import { useCalendar } from "@/contexts/CalendarContext";
import { useUiStore } from "@/store/uiStore";
import { useSettingsStore } from "@/store/settingsStore";
import { useTranslation } from "react-i18next";

export function CalendarView() {
  const { t } = useTranslation();
  const calRef = useRef<FullCalendar | null>(null);
  const { registerCal, updateState, view, currentDate, goPrev, goNext } = useCalendar();
  const timeFormat = useSettingsStore((s) => s.timeFormat);
  const touchStartX = useRef<number | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalEvent | null>(null);
  const [defaultStart, setDefaultStart] = useState<string | undefined>();
  const [defaultEnd, setDefaultEnd] = useState<string | undefined>();
  const [rangeStart, setRangeStart] = useState<string | undefined>();
  const [rangeEnd, setRangeEnd] = useState<string | undefined>();
  const [popoverEvent, setPopoverEvent] = useState<CalEvent | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<DOMRect | null>(null);

  const updateEvent = useUpdateEvent();
  const deleteEvent = useDeleteEvent();

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

  const handleEventDrop = useCallback(
    async (info: EventDropArg) => {
      try {
        await updateEvent.mutateAsync({
          id: info.event.id,
          body: {
            start_time: info.event.start!.toISOString(),
            end_time: info.event.end!.toISOString(),
            all_day: info.event.allDay,
          },
        });
      } catch {
        info.revert();
      }
    },
    [updateEvent],
  );

  const handleEventResize = useCallback(
    async (info: EventResizeDoneArg) => {
      try {
        await updateEvent.mutateAsync({
          id: info.event.id,
          body: {
            start_time: info.event.start!.toISOString(),
            end_time: info.event.end!.toISOString(),
          },
        });
      } catch {
        info.revert();
      }
    },
    [updateEvent],
  );

  const handleEventMouseEnter = useCallback((info: EventHoveringArg) => {
    const el = info.el;
    el.style.transition = "transform 0.12s ease, box-shadow 0.12s ease, opacity 0.12s ease";
    el.style.transform = "scale(1.03)";
    el.style.boxShadow = "0 4px 12px rgba(0,0,0,0.25)";
    el.style.opacity = "0.92";
    el.style.zIndex = "5";
    if (info.event.extendedProps.source === "local") {
      el.style.cursor = "grab";
    }
  }, []);

  const handleEventMouseLeave = useCallback((info: EventHoveringArg) => {
    const el = info.el;
    el.style.transform = "";
    el.style.boxShadow = "";
    el.style.opacity = "";
    el.style.zIndex = "";
    el.style.cursor = "";
  }, []);

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
      if (!clicked) return;

      // Capture rect before the FC more-popover is potentially closed (element stays in DOM briefly)
      const anchor = arg.el.getBoundingClientRect();

      // Close any open FullCalendar "more" popover so it doesn't sit behind our popover
      document.querySelector<HTMLElement>(".fc-popover .fc-popover-close")?.click();

      setPopoverEvent(clicked);
      setPopoverAnchor(anchor);
    },
    [events]
  );

  const closePopover = useCallback(() => {
    setPopoverEvent(null);
    setPopoverAnchor(null);
  }, []);

  const openEditModal = useCallback((ev: CalEvent) => {
    setPopoverEvent(null);
    setPopoverAnchor(null);
    setSelectedEvent(ev);
    setDefaultStart(undefined);
    setDefaultEnd(undefined);
    setModalOpen(true);
  }, []);

  const slotLabelFormat =
    timeFormat === "24h"
      ? { hour: "2-digit" as const, minute: "2-digit" as const, hour12: false }
      : { hour: "numeric" as const, minute: "2-digit" as const, omitZeroMinute: true, meridiem: "lowercase" as const };

  // eventTimeFormat drives arg.timeText inside eventContent — always show minutes, use lowercase am/pm
  const eventTimeFormat =
    timeFormat === "24h"
      ? { hour: "2-digit" as const, minute: "2-digit" as const, hour12: false }
      : { hour: "numeric" as const, minute: "2-digit" as const, meridiem: "lowercase" as const };

  return (
    <div
      className="flex-1 overflow-hidden flex flex-col"
      onTouchStart={(e) => { touchStartX.current = e.touches[0].clientX; }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const delta = touchStartX.current - e.changedTouches[0].clientX;
        if (Math.abs(delta) > 50) delta > 0 ? goNext() : goPrev();
        touchStartX.current = null;
      }}
    >
      <div className="flex-1 overflow-auto p-3 pt-2">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, multiMonthPlugin, listPlugin, interactionPlugin, rrulePlugin]}
          initialView={view}
          initialDate={currentDate.toISOString()}
          /* We provide our own toolbar in the Header */
          headerToolbar={false}
          height="100%"
          selectable
          selectMirror
          editable
          events={fcEvents}
          datesSet={handleDatesSet}
          select={handleDateSelect}
          eventClick={handleEventClick}
          eventDrop={handleEventDrop}
          eventResize={handleEventResize}
          eventMouseEnter={handleEventMouseEnter}
          eventMouseLeave={handleEventMouseLeave}
          eventDisplay="block"
          dayMaxEvents={4}
          multiMonthMaxColumns={4}
          nowIndicator
          weekends
          firstDay={1}
          /* ── TimeGrid (Week / Day) premium config ── */
          allDaySlot
          allDayText={t("all_day_label")}
          slotDuration="00:30:00"
          slotLabelInterval="01:00:00"
          slotLabelFormat={slotLabelFormat}
          slotLabelContent={(arg) => {
            const m = arg.text.match(/^([\d:]+)(am|pm)$/i);
            if (!m) return <>{arg.text}</>;
            return <span className="tabular-nums">{m[1]}<span className="fc-slot-meridiem">{m[2]}</span></span>;
          }}
          eventTimeFormat={eventTimeFormat}
          eventContent={(arg) => {
            const { timeText, event } = arg;
            return (
              <div className="truncate w-full leading-snug">
                {timeText && (
                  <span className="font-bold mr-1 tabular-nums" style={{ fontSize: "0.62rem" }}>
                    {timeText}
                  </span>
                )}
                <span style={{ fontSize: "0.7rem", fontWeight: 600 }}>{event.title}</span>
              </div>
            );
          }}
          eventDidMount={(info) => {
            const start = info.event.start;
            if (!start) return;
            const h = start.getHours();
            const accent =
              h >= 5  && h < 12 ? "#6366F1" :
              h >= 12 && h < 17 ? "#0EA5E9" :
              h >= 17 && h < 21 ? "#7C3AED" :
                                  "#475569";
            info.el.style.setProperty("--tod-accent", accent);
          }}
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

      {popoverEvent && popoverAnchor && (
        <EventPopover
          event={popoverEvent}
          anchor={popoverAnchor}
          sources={sources}
          onClose={closePopover}
          onEdit={() => openEditModal(popoverEvent)}
          onDelete={() => { deleteEvent.mutate(popoverEvent.id); closePopover(); }}
        />
      )}
    </div>
  );
}
