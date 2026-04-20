import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { CalEvent, EventCreate, EventUpdate } from "@/types";

const SYNC_CHANNEL = "calsync-events";

function broadcastInvalidate() {
  try { new BroadcastChannel(SYNC_CHANNEL).postMessage("invalidate"); } catch {}
}

/** Call once at the app root to keep other tabs in sync. */
export function useEventSyncListener() {
  const qc = useQueryClient();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const ch = new BroadcastChannel(SYNC_CHANNEL);
    ch.onmessage = () => {
      qc.invalidateQueries({ queryKey: ["events"] });
      qc.invalidateQueries({ queryKey: ["calendar-sources"] });
    };
    return () => ch.close();
  }, [qc]);
}

export function useEvents(start?: string, end?: string) {
  return useQuery<CalEvent[]>({
    queryKey: ["events", start, end],
    queryFn: () =>
      api
        .get("/api/v1/events", { params: { start, end } })
        .then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useCreateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: EventCreate) =>
      api.post<CalEvent>("/api/v1/events", body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); broadcastInvalidate(); },
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: EventUpdate }) =>
      api.patch<CalEvent>(`/api/v1/events/${id}`, body).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); broadcastInvalidate(); },
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/events/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); broadcastInvalidate(); },
  });
}

/** Sync public holidays for the given country code via Nager.Date.
 *  Creates (or updates) the holiday CalendarSource and upserts holiday events.
 *  Invalidates both calendar-sources and events queries on success.
 */
export function useSyncHolidays() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (countryCode: string) =>
      api
        .post("/api/v1/calendar-sources/holidays/sync", { country_code: countryCode })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-sources"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

/** Initiate Google Calendar OAuth — fetches the Google authorization URL. */
export function useGoogleInit() {
  return useMutation({
    mutationFn: () => {
      const redirectUri = typeof window !== "undefined"
        ? `${window.location.origin}/auth/google/callback`
        : undefined;
      return api
        .get<{ auth_url: string }>("/api/v1/auth/google/init", { params: { redirect_uri: redirectUri } })
        .then((r) => r.data.auth_url);
    },
  });
}

/** Sync events for a connected Google Calendar source. */
export function useSyncGoogleCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) =>
      api.post(`/api/v1/calendar-sources/${sourceId}/sync`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-sources"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

/** Initiate Outlook Calendar OAuth — fetches the Microsoft authorization URL. */
export function useOutlookInit() {
  return useMutation({
    mutationFn: () => {
      const redirectUri = typeof window !== "undefined"
        ? `${window.location.origin}/auth/outlook/callback`
        : undefined;
      return api
        .get<{ auth_url: string }>("/api/v1/auth/outlook/init", { params: { redirect_uri: redirectUri } })
        .then((r) => r.data.auth_url);
    },
  });
}

/** Sync events for a connected Outlook Calendar source. */
export function useSyncOutlookCalendar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) =>
      api.post(`/api/v1/calendar-sources/${sourceId}/sync`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-sources"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}

/** Disconnect (delete) a calendar source and revoke its OAuth token. */
export function useDisconnectCalendarSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) =>
      api.delete(`/api/v1/calendar-sources/${sourceId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["calendar-sources"] });
      qc.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
