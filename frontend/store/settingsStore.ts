import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface SavedAccount {
  id: string;
  email: string;
  full_name: string | null;
}

export type DateFormat = "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD" | "DD.MM.YYYY" | "D MMMM YYYY";
export type TimeFormat = "12h" | "24h";

interface SettingsState {
  language: string;
  region: string;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  offlineMode: boolean;
  savedAccounts: SavedAccount[];
  setLanguage: (lang: string) => void;
  setRegion: (region: string) => void;
  setDateFormat: (fmt: DateFormat) => void;
  setTimeFormat: (fmt: TimeFormat) => void;
  setOfflineMode: (v: boolean) => void;
  upsertSavedAccount: (account: SavedAccount) => void;
  removeSavedAccount: (email: string) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      language: "en",
      region: "US",
      dateFormat: "MM/DD/YYYY",
      timeFormat: "12h",
      offlineMode: false,
      savedAccounts: [],
      setLanguage: (language) => set({ language }),
      setRegion: (region) => set({ region }),
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setTimeFormat: (timeFormat) => set({ timeFormat }),
      setOfflineMode: (offlineMode) => set({ offlineMode }),
      upsertSavedAccount: (account) =>
        set((state) => {
          const filtered = state.savedAccounts.filter((a) => a.email !== account.email);
          return { savedAccounts: [account, ...filtered].slice(0, 5) };
        }),
      removeSavedAccount: (email) =>
        set((state) => ({
          savedAccounts: state.savedAccounts.filter((a) => a.email !== email),
        })),
    }),
    { name: "calsync-settings" }
  )
);
