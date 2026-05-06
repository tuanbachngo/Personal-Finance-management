"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AppShell({ title, subtitle, children }: AppShellProps) {
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

  return (
    <div className="flex min-h-screen w-full bg-bg font-sans text-text">
      <Sidebar collapsed={sidebarCollapsed} onToggleCollapsed={toggleSidebar} />

      <main className="h-screen min-w-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-4 md:px-8 md:py-8">
          <Topbar title={title} subtitle={subtitle} />

          <div className="w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
