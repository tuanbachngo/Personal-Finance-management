"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { ReminderBanner } from "@/components/common/reminder-banner";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { DashboardReminder } from "@/types/api";

type NotificationCenterState = {
  allReminders: DashboardReminder[];
  hiddenReminderIds: string[];
  onDismissReminder: (id: string) => void;
};

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  notificationCenter?: NotificationCenterState;
};

export function AppShell({ title, subtitle, children, notificationCenter }: AppShellProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const cached = window.localStorage.getItem("vault_sidebar_collapsed");
    if (cached === "1") {
      setSidebarCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current;
      if (typeof window !== "undefined") {
        window.localStorage.setItem("vault_sidebar_collapsed", next ? "1" : "0");
      }
      return next;
    });
  };

  const allReminders = notificationCenter?.allReminders || [];
  const hiddenReminderIds = notificationCenter?.hiddenReminderIds || [];
  const hiddenIdSet = new Set(hiddenReminderIds);
  const visibleFloatingReminders = allReminders.filter((row) => !hiddenIdSet.has(row.id));
  const hiddenReminders = allReminders.filter((row) => hiddenIdSet.has(row.id));

  return (
    <div className="flex min-h-screen w-full bg-bg font-sans text-text">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggleCollapsed={toggleSidebar}
        reminders={allReminders}
        hiddenReminders={hiddenReminders}
      />

      <main className="h-screen min-w-0 flex-1 overflow-y-auto">
        <div className="relative mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-8 md:py-8">
          <Topbar title={title} subtitle={subtitle} />

          {visibleFloatingReminders.length > 0 ? (
            <div className="pointer-events-none fixed right-4 top-4 z-50 w-[min(360px,calc(100vw-1rem))] lg:right-6 lg:top-6">
              <div className="pointer-events-auto space-y-3">
                {visibleFloatingReminders.map((reminder) => (
                  <div key={reminder.id} className="transition-all">
                    <ReminderBanner
                      reminder={reminder}
                      onDismiss={notificationCenter?.onDismissReminder}
                      compact
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
