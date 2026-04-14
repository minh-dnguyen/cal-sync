"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { detectCountryCode } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { SearchableSelect } from "@/components/ui/SearchableSelect";
import { COUNTRIES, TIMEZONES } from "@/lib/geoData";

const inputClass =
  "w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm";

const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5";

export default function RegisterPage() {
  const { t } = useTranslation();
  const router   = useRouter();
  const setToken = useAuthStore((s) => s.setToken);

  const [form, setForm] = useState({
    email:        "",
    password:     "",
    full_name:    "",
    country_code: "",
    timezone:     Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC",
  });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  // Auto-detect country from browser locale
  useEffect(() => {
    setForm((f) => ({ ...f, country_code: detectCountryCode() }));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.password.length < 8) {
      setError(t("password_too_short"));
      return;
    }
    setLoading(true);
    try {
      const res = await api.post("/api/v1/auth/register", form);
      setToken(res.data.access_token);
      router.push("/calendar");
    } catch (err: any) {
      setError(err.response?.data?.detail ?? t("registration_failed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-500 text-white text-2xl font-bold mb-3">
            C
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t("create_account_title")}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("register_subtitle")}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700 rounded-2xl p-8 space-y-5"
        >
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {/* Full name */}
          <div>
            <label className={labelClass}>{t("full_name")}</label>
            <input
              type="text"
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              placeholder="Jane Doe"
              className={inputClass}
            />
          </div>

          {/* Email */}
          <div>
            <label className={labelClass}>{t("email")}</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
              placeholder="you@example.com"
              className={inputClass}
            />
          </div>

          {/* Password */}
          <div>
            <label className={labelClass}>{t("password")}</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              required
              placeholder={t("min_password")}
              className={inputClass}
            />
          </div>

          {/*
            Country & Timezone — two-column grid.
            Both SearchableSelect dropdowns use position:fixed internally,
            so they float over the "Create account" button below.
          */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>{t("country")}</label>
              <SearchableSelect
                options={COUNTRIES}
                value={form.country_code}
                onChange={(v) => setForm((f) => ({ ...f, country_code: v }))}
                placeholder="Search country…"
              />
            </div>

            <div>
              <label className={labelClass}>{t("timezone")}</label>
              <SearchableSelect
                options={TIMEZONES}
                value={form.timezone}
                onChange={(v) => setForm((f) => ({ ...f, timezone: v }))}
                placeholder="Search timezone…"
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-500 hover:bg-primary-600 disabled:opacity-60 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm"
          >
            {loading ? t("creating_account") : t("create_account")}
          </button>

          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            {t("already_account")}{" "}
            <Link href="/login" className="text-primary-600 dark:text-primary-400 font-medium hover:underline">
              {t("sign_in")}
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
