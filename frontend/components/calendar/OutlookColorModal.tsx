"use client";

import { Modal } from "@/components/ui/Modal";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: (keepColors: boolean) => void;
}

const SAMPLE_COLORS = [
  { hex: "#e74856", label: "Red" },
  { hex: "#ff8c00", label: "Orange" },
  { hex: "#fce100", label: "Yellow" },
  { hex: "#00b294", label: "Green" },
  { hex: "#0078d4", label: "Blue" },
  { hex: "#8764b8", label: "Purple" },
  { hex: "#c30052", label: "Cranberry" },
];

export function OutlookColorModal({ open, onClose, onConfirm }: Props) {
  return (
    <Modal open={open} onClose={onClose} title="Outlook Calendar event colors" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Outlook Calendar events can have individual category colors. Would you like to keep them?
        </p>

        {/* Color preview strip */}
        <div className="flex items-center gap-1.5 py-1">
          {SAMPLE_COLORS.map((c) => (
            <span
              key={c.hex}
              title={c.label}
              className="w-5 h-5 rounded-full flex-shrink-0"
              style={{ backgroundColor: c.hex }}
            />
          ))}
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">…</span>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={() => onConfirm(true)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-primary-500 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors"
          >
            <div className="flex gap-1">
              {SAMPLE_COLORS.slice(0, 4).map((c) => (
                <span
                  key={c.hex}
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-primary-700 dark:text-primary-300 text-center">
              Keep Outlook colors
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight">
              Each event uses its category color
            </span>
          </button>

          <button
            type="button"
            onClick={() => onConfirm(false)}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <div className="flex gap-1">
              {[0, 1, 2, 3].map((i) => (
                <span
                  key={i}
                  className="w-3 h-3 rounded-full bg-[#0078d4]"
                />
              ))}
            </div>
            <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 text-center">
              Use calendar color
            </span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight">
              All events use one color
            </span>
          </button>
        </div>

        <p className="text-[11px] text-gray-400 dark:text-gray-500 text-center">
          You can change this later in Settings → Connected Accounts
        </p>
      </div>
    </Modal>
  );
}
