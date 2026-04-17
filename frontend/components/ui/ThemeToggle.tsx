"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  /** toggle = sliding sun/moon switch for header; dropdown = <select> for settings page */
  variant?: "toggle" | "dropdown";
}

export function ThemeToggle({ variant = "toggle" }: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={
          variant === "toggle"
            ? "w-12 h-6 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse"
            : "w-full h-10 rounded-lg bg-gray-100 dark:bg-gray-700 animate-pulse"
        }
      />
    );
  }

  const current = theme ?? "system";

  if (variant === "dropdown") {
    return (
      <select
        value={current}
        onChange={(e) => setTheme(e.target.value)}
        className="w-full px-3 py-2.5 rounded-lg border border-app-border bg-app-input text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
      >
        <option value="system">Default (system)</option>
        <option value="light">Light mode</option>
        <option value="dark">Dark mode</option>
      </select>
    );
  }

  // toggle: sliding pill with sun (left) and moon (right) icons
  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="relative flex-shrink-0 flex items-center w-12 h-6 rounded-full transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 bg-app-border"
    >
      {/* Sun icon — visible in dark mode on the left track */}
      <Sun
        size={11}
        className={`absolute left-1.5 transition-opacity duration-200 ${
          isDark ? "opacity-40 text-gray-400" : "opacity-0"
        }`}
      />
      {/* Moon icon — visible in light mode on the right track */}
      <Moon
        size={11}
        className={`absolute right-1.5 transition-opacity duration-200 ${
          isDark ? "opacity-0" : "opacity-40 text-gray-500"
        }`}
      />
      {/* Sliding thumb */}
      <span
        className={`absolute w-5 h-5 rounded-full bg-app-surface shadow-sm flex items-center justify-center transition-transform duration-300 ${
          isDark ? "translate-x-[26px]" : "translate-x-[2px]"
        }`}
      >
        {isDark
          ? <Moon size={11} className="text-gray-300" />
          : <Sun size={11} className="text-gray-500" />
        }
      </span>
    </button>
  );
}
