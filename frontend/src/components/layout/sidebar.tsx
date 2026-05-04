"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";

type NavItem = {
  label: string;
  href: string;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Transactions", href: "/transactions" },
  { label: "Reports", href: "/reports" },
  { label: "Budgets", href: "/budgets" },
  { label: "Balance History", href: "/balance-history" },
  { label: "User Management", href: "/user-management", adminOnly: true }
];

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, clearSession } = useAuth();
  const { users, selectedUserId, setSelectedUserId, loadingUsers } = useUserScope();

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="p-6">
        <p className="text-[10px] uppercase tracking-wider text-muted font-bold">Personal Finance</p>
        <h1 className="mt-1 text-2xl font-black text-text tracking-tight">Vaul<span className="text-primary">ted</span></h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="mb-6 rounded-lg border border-border bg-bg p-3 text-xs">
        <p className="text-muted">Signed in as</p>
        <p className="font-medium text-text">{user?.UserName || "-"}</p>
        <p className="text-muted">{user?.Email || "-"}</p>
        <p className="mt-1 text-primary">Role: {String(user?.UserRole || "USER").toUpperCase()}</p>
      </div>

      {isAdmin ? (
        <div className="mb-4">
          <label className="mb-1 block text-xs text-muted">Current User Scope</label>
          <select
            className="focus-ring w-full rounded-md border border-border bg-bg px-2 py-2 text-sm text-text"
            value={selectedUserId ?? ""}
            onChange={(event) => setSelectedUserId(Number(event.target.value))}
            disabled={loadingUsers || users.length === 0}
          >
            {users.map((row) => (
              <option key={row.UserID} value={row.UserID}>
                {row.UserName} ({row.Email})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <nav className="space-y-2">
        {visibleItems.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`focus-ring flex items-center rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-text hover:bg-surface-hover"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

        <button
          type="button"
          className="focus-ring mt-6 w-full rounded-md px-3 py-2 text-left text-sm font-medium text-danger transition-colors hover:bg-danger/10"
          onClick={async () => {
            await clearSession(true);
            router.replace("/login");
          }}
        >
          Logout
        </button>

        <div className="mt-8 border-t border-border pt-4 text-[10px] text-muted">
          Streamlit legacy app remains available during the migration phase.
        </div>
      </div>
    </aside>
  );
}
