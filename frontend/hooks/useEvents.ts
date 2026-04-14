import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { CalEvent, EventCreate, EventUpdate } from "@/types";

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useUpdateEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: EventUpdate }) =>
      api.patch<CalEvent>(`/api/v1/events/${id}`, body).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}

export function useDeleteEvent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/v1/events/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }),
  });
}
