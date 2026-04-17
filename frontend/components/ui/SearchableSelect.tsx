"use client";

import { useRef, useState, useEffect } from "react";
import { ChevronDown, Search, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = "Search...",
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = options.find((o) => o.value === value);
  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Focus search input when dropdown opens
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [open]);

  function handleToggle() {
    setOpen((v) => {
      if (v) setQuery("");
      return !v;
    });
  }

  function handleSelect(val: string) {
    onChange(val);
    setOpen(false);
    setQuery("");
  }

  return (
    /*
     * position: relative on the container is the anchor for the dropdown.
     * The parent must NOT have overflow: hidden, otherwise the dropdown
     * will be clipped. Settings sections handle this by using overflow: visible.
     */
    <div className="relative" ref={containerRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg border border-app-border bg-app-input text-gray-900 dark:text-white text-sm hover:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-colors"
      >
        {/* Truncate selected label so it never wraps */}
        <span className={`truncate ${selected ? "" : "text-gray-400 dark:text-gray-500"}`}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          size={15}
          className={`text-gray-400 flex-shrink-0 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown
            - position: absolute so it anchors to the container, not the viewport
            - top: calc(100% + 4px) — opens directly below the trigger with a 4 px gap
            - left: 0 / width: 100% — exact horizontal alignment with the trigger
            - z-index: 9999 — floats above everything including the submit button below
      */}
      {open && (
        <div
          role="listbox"
          className="absolute left-0 w-full z-[9999] mt-1 bg-app-surface border border-app-border rounded-xl shadow-xl overflow-hidden"
          style={{ top: "calc(100% + 4px)" }}
        >
          {/* Search row */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-app-border">
            <Search size={13} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none py-0.5 min-w-0"
            />
          </div>

          {/* Options list */}
          <ul className="max-h-52 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-gray-400 dark:text-gray-500 text-center">
                No results
              </li>
            ) : (
              filtered.map((opt) => (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={opt.value === value}
                    onMouseDown={(e) => e.preventDefault()} // keep focus in search input
                    onClick={() => handleSelect(opt.value)}
                    className={`flex items-center justify-between w-full px-4 py-2 text-sm text-left transition-colors ${
                      opt.value === value
                        ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                        : "text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    {/* Label: no wrapping, truncate with ellipsis if too long */}
                    <span className="truncate whitespace-nowrap overflow-hidden mr-2">
                      {opt.label}
                    </span>
                    {opt.value === value && (
                      <Check size={13} className="text-primary-500 flex-shrink-0" />
                    )}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
