"use client";

import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

interface ThemeToggleProps {
  /** compact = two icon buttons for header; dropdown = <select> for settings page */
  variant?: "compact" | "dropdown";
}

export function ThemeToggle({ variant = "compact" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <div
        className={
          variant === "compact"
            ? "w-[76px] h-9"
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
        className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
      >
        <option value="system">Default (system)</option>
        <option value="light">Light mode</option>
        <option value="dark">Dark mode</option>
      </select>
    );
  }

  // compact: Sun button + Moon button
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => setTheme("light")}
        title="Light mode"
        aria-pressed={current === "light"}
        className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
          current === "light"
            ? "bg-amber-100 dark:bg-amber-900/40 text-amber-500 dark:text-amber-400"
            : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200"
        }`}
      >
        <Sun size={16} />
      </button>
      <button
        onClick={() => setTheme("dark")}
        title="Dark mode"
        aria-pressed={current === "dark"}
        className={`flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
          current === "dark"
            ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-500 dark:text-indigo-400"
            : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-200"
        }`}
      >
        <Moon size={16} />
      </button>
    </div>
  );
}
