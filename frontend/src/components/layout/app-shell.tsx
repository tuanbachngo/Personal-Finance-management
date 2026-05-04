import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

type AppShellProps = {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
};

export function AppShell({ title, subtitle, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen w-full bg-bg font-sans text-text">
      <Sidebar />
      <main className="flex w-full flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle} />
        <div className="flex-1 p-4 md:p-8 overflow-auto">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
