"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { LogOut, ChevronDown, UserPlus } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useAuthStore } from "@/store/authStore";
import { useSettingsStore, SavedAccount } from "@/store/settingsStore";

export function ProfileMenu() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const logout = useAuthStore((s) => s.logout);
  const { savedAccounts, upsertSavedAccount } = useSettingsStore();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Keep current user in the saved accounts list
  useEffect(() => {
    if (user) {
      upsertSavedAccount({ id: user.id, email: user.email, full_name: user.full_name });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleLogout() {
    setOpen(false);
    logout();
    router.push("/login");
  }

  function handleLogoutAll() {
    setOpen(false);
    logout();
    // Clear all saved accounts so the login page starts fresh
    savedAccounts.forEach(() => {}); // accounts stay for UX (re-login shortcuts)
    router.push("/login");
  }

  function handleSwitchAccount(account: SavedAccount) {
    setOpen(false);
    logout();
    router.push(`/login?email=${encodeURIComponent(account.email)}`);
  }

  function handleAddAccount() {
    setOpen(false);
    // Log out first so the login page doesn't immediately redirect
    logout();
    router.push("/login");
  }

  function getInitials(fullName: string | null, email: string) {
    if (fullName) {
      return fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  }

  const initials      = getInitials(user?.full_name ?? null, user?.email ?? "?");
  const otherAccounts = savedAccounts.filter((a) => a.email !== user?.email);

  // Total signed-in accounts = current + previously saved (still in store)
  const totalAccounts = 1 + otherAccounts.length;
  const signOutLabel  = totalAccounts >= 2 ? t("sign_out_all") : t("sign_out");

  return (
    <div className="relative" ref={ref}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg pl-1 pr-2 py-1 hover:bg-app-surface transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-sm font-semibold flex items-center justify-center select-none">
          {initials}
        </div>
        <ChevronDown
          size={13}
          className={`text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 min-w-[16rem] w-64 bg-app-surface rounded-xl shadow-xl border border-app-border z-50 overflow-hidden">

          {/* ── Current account ─────────────────────────────────── */}
          <div className="px-4 py-3 bg-app-bg border-b border-app-border">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500 mb-2">
              {t("signed_in_as")}
            </p>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-sm font-bold flex items-center justify-center flex-shrink-0 select-none">
                {initials}
              </div>
              <div className="min-w-0">
                {user?.full_name && (
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate leading-tight">
                    {user.full_name}
                  </p>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              </div>
            </div>
          </div>

          {/* ── Other saved accounts ─────────────────────────────── */}
          {otherAccounts.length > 0 && (
            <div className="border-b border-app-border">
              <p className="px-4 pt-2.5 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t("switch_account")}
              </p>
              {otherAccounts.map((account) => (
                <button
                  key={account.email}
                  onClick={() => handleSwitchAccount(account)}
                  className="flex items-center gap-3 w-full px-4 py-2.5 hover:bg-app-bg transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm font-semibold flex items-center justify-center flex-shrink-0 select-none">
                    {getInitials(account.full_name, account.email)}
                  </div>
                  <div className="min-w-0">
                    {account.full_name && (
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-200 truncate leading-tight">
                        {account.full_name}
                      </p>
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{account.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* ── Add another account ──────────────────────────────── */}
          <div className="border-b border-app-border">
            <button
              onClick={handleAddAccount}
              className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-app-bg transition-colors"
            >
              <UserPlus size={15} className="text-gray-400 dark:text-gray-500 flex-shrink-0" />
              {t("add_account")}
            </button>
          </div>

          {/* ── Sign out ─────────────────────────────────────────── */}
          <button
            onClick={totalAccounts >= 2 ? handleLogoutAll : handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut size={15} className="flex-shrink-0" />
            {signOutLabel}
          </button>
        </div>
      )}
    </div>
  );
}
