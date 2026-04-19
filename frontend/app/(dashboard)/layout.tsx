"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { CalendarProvider } from "@/contexts/CalendarContext";
import { useEventSyncListener } from "@/hooks/useEvents";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";

function DashboardInner({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useEventSyncListener();
  useInactivityTimeout();

  useEffect(() => {
    if (!token) router.replace("/login");
  }, [token, router]);

  if (!token) return null;

  // Hide the sidebar on the settings page without touching sidebarOpen state,
  // so it restores automatically when navigating back.
  const isSettings = pathname === "/settings";

  return (
    <CalendarProvider>
      <div className="flex flex-col h-screen overflow-hidden">
        <Header onMenuToggle={() => setSidebarOpen((v) => !v)} />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar open={sidebarOpen && !isSettings} onClose={() => setSidebarOpen(false)} />
          <main className="flex-1 overflow-hidden flex flex-col">{children}</main>
        </div>
      </div>
    </CalendarProvider>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardInner>{children}</DashboardInner>;
}
