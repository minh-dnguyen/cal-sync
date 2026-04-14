import { create } from "zustand";

/**
 * Lightweight store for cross-component UI triggers.
 * Incrementing `newEventTrigger` signals CalendarView to open the
 * "new event" modal — so any component (e.g. Sidebar Create button)
 * can trigger it without being a direct ancestor.
 */
interface UiState {
  newEventTrigger: number;
  triggerNewEvent: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  newEventTrigger: 0,
  triggerNewEvent: () => set((s) => ({ newEventTrigger: s.newEventTrigger + 1 })),
}));
