"use client";

import {
  createContext,
  useContext,
  useState,
  useRef,
} from "react";
import type FullCalendar from "@fullcalendar/react";

interface CalendarCtx {
  /** CalendarView calls this to hand over the FullCalendar instance */
  registerCal: (cal: FullCalendar | null) => void;
  /** Navigation actions (Header / MiniCalendar call these) */
  goToday: () => void;
  goPrev: () => void;
  goNext: () => void;
  goToDate: (date: Date) => void;
  changeView: (view: string) => void;
  /** State kept in sync by CalendarView via datesSet */
  title: string;       // e.g. "April 2026" from FullCalendar
  view: string;        // e.g. "dayGridMonth"
  currentDate: Date;   // start of the visible range
  updateState: (title: string, view: string, date: Date) => void;
}

const CalendarContext = createContext<CalendarCtx>({
  registerCal: () => {},
  goToday: () => {},
  goPrev: () => {},
  goNext: () => {},
  goToDate: () => {},
  changeView: () => {},
  title: "",
  view: "dayGridMonth",
  currentDate: new Date(),
  updateState: () => {},
});

export function CalendarProvider({ children }: { children: React.ReactNode }) {
  const calRef = useRef<FullCalendar | null>(null);
  const [title, setTitle] = useState("");
  const [view, setView] = useState("dayGridMonth");
  const [currentDate, setCurrentDate] = useState(new Date());

  const registerCal = (cal: FullCalendar | null) => {
    calRef.current = cal;
  };

  const goToday = () => calRef.current?.getApi().today();
  const goPrev  = () => calRef.current?.getApi().prev();
  const goNext  = () => calRef.current?.getApi().next();
  const goToDate = (date: Date) => calRef.current?.getApi().gotoDate(date);
  const changeView = (v: string) => calRef.current?.getApi().changeView(v);

  const updateState = (t: string, v: string, d: Date) => {
    setTitle(t);
    setView(v);
    setCurrentDate(d);
  };

  return (
    <CalendarContext.Provider
      value={{ registerCal, goToday, goPrev, goNext, goToDate, changeView, title, view, currentDate, updateState }}
    >
      {children}
    </CalendarContext.Provider>
  );
}

export const useCalendar = () => useContext(CalendarContext);
