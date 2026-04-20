"use client";

import { Suspense } from "react";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { useQueryClient } from "@tanstack/react-query";
// Note: useAuthStore.getState() is used directly in effects to avoid Zustand hydration timing issues

function CallbackHandler() {
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const called = useRef(false);

  useEffect(() => {
    // Prevent double-call in React strict mode
    if (called.current) return;
    called.current = true;

    const code = params.get("code");
    const error = params.get("error");

    if (error || !code) {
      setErrorMsg(
        error === "access_denied"
          ? "Google sign-in was cancelled."
          : "Authorization failed. Please try again."
      );
      setStatus("error");
      return;
    }

    // Read token directly from store state (avoids Zustand hydration timing issues
    // where the React subscription hasn't fired yet but localStorage is already loaded)
    const token = useAuthStore.getState().token;
    if (!token) {
      router.replace("/login");
      return;
    }

    const redirectUri = `${window.location.origin}/auth/google/callback`;
    api
      .post("/api/v1/auth/google/exchange", { code, redirect_uri: redirectUri })
      .then(() => {
        // Signal settings page to show the color-preference dialog
        localStorage.setItem("calsync-google-just-connected", "true");
        qc.invalidateQueries({ queryKey: ["calendar-sources"] });
        router.replace("/settings");
      })
      .catch((err) => {
        const detail = err?.response?.data?.detail ?? "Failed to connect Google Calendar.";
        setErrorMsg(detail);
        setStatus("error");
      });
  }, [params, router, qc]);

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-sm w-full text-center space-y-4">
          <div className="text-4xl">⚠️</div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Connection failed</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{errorMsg}</p>
          <button
            onClick={() => router.replace("/settings")}
            className="w-full py-2 px-4 rounded-lg bg-primary-500 hover:bg-primary-600 text-white text-sm font-medium transition-colors"
          >
            Back to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
        <p className="text-sm text-gray-500 dark:text-gray-400">Connecting Google Calendar…</p>
      </div>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
          <div className="flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
