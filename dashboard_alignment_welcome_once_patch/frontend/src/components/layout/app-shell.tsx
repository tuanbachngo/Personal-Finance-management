import type { ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function AppShell({ title, subtitle, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-bg font-sans text-text">
      <Sidebar />

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
