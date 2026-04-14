import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { User } from "@/types";

export function useAuth() {
  const { token, user, setUser, logout } = useAuthStore();

  const { data, isLoading } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/api/v1/users/me").then((r) => r.data),
    enabled: !!token,
    retry: false,
  });

  useEffect(() => {
    if (data) setUser(data);
  }, [data, setUser]);

  return {
    token,
    user: data ?? user,
    isLoading: !!token && isLoading,
    isAuthenticated: !!token,
    logout,
  };
}
