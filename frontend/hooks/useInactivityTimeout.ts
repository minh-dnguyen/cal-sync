"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/authStore";

const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const EVENTS = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;

export function useInactivityTimeout() {
  const logout = useAuthStore((s) => s.logout);
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!token) return;

    function reset() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        logout();
        router.replace("/login");
      }, TIMEOUT_MS);
    }

    reset();
    EVENTS.forEach((ev) => window.addEventListener(ev, reset, { passive: true }));
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      EVENTS.forEach((ev) => window.removeEventListener(ev, reset));
    };
  }, [token, logout, router]);
}
