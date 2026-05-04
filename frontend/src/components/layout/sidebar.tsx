"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

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

function getInitial(name?: string | null, email?: string | null): string {
  const source = (name || email || "U").trim();
  return source.charAt(0).toUpperCase();
}

export function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, clearSession } = useAuth();
  const { users, selectedUserId, setSelectedUserId, loadingUsers } = useUserScope();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const visibleItems = navItems.filter((item) => !item.adminOnly || isAdmin);

  const avatarInitial = useMemo(
    () => getInitial(user?.UserName, user?.Email),
    [user?.Email, user?.UserName]
  );

  const role = String(user?.UserRole || "USER").toUpperCase();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="p-6">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted">
          Personal Finance
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight text-text">
          Vaul<span className="text-primary">ted</span>
        </h1>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 pb-4">
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
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

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

        <div className="mt-auto border-t border-border pt-4">
          <div className="relative">
            <button
              type="button"
              className="focus-ring flex w-full items-center gap-3 rounded-xl border border-border bg-bg p-3 text-left transition-colors hover:bg-surface-hover"
              onClick={() => setProfileMenuOpen((open) => !open)}
              aria-expanded={profileMenuOpen}
              aria-haspopup="menu"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/40 bg-primary/10 font-mono text-sm font-bold text-primary">
                {avatarInitial}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text">
                  {user?.UserName || "Account"}
                </p>
                <p className="truncate text-xs text-muted">{role}</p>
              </div>

              <span className="text-xs text-muted">{profileMenuOpen ? "▲" : "▼"}</span>
            </button>

            {profileMenuOpen ? (
              <div
                className="absolute bottom-[calc(100%+8px)] left-0 z-50 w-full rounded-2xl border border-border bg-surface p-3 shadow-2xl"
                role="menu"
              >
                <div className="border-b border-border pb-3">
                  <p className="truncate text-sm font-semibold text-text">
                    {user?.UserName || "-"}
                  </p>
                  <p className="mt-1 truncate text-xs text-muted">{user?.Email || "-"}</p>
                  <span className="mt-2 inline-flex rounded-full border border-primary/30 bg-primary/10 px-2 py-1 text-[10px] font-bold uppercase text-primary">
                    {role}
                  </span>
                </div>

                <div className="py-2">
                  <button
                    type="button"
                    className="focus-ring w-full rounded-lg px-3 py-2 text-left text-sm text-text transition-colors hover:bg-surface-hover"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    Personal Info
                  </button>
                  <button
                    type="button"
                    className="focus-ring w-full rounded-lg px-3 py-2 text-left text-sm text-text transition-colors hover:bg-surface-hover"
                    onClick={() => setProfileMenuOpen(false)}
                  >
                    Change Password
                  </button>
                </div>

                <button
                  type="button"
                  className="focus-ring w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
                  onClick={async () => {
                    setProfileMenuOpen(false);
                    await clearSession(true);
                    router.replace("/login");
                  }}
                >
                  Logout
                </button>
              </div>
            ) : null}
          </div>

          <p className="mt-4 text-[10px] leading-relaxed text-muted">
            Streamlit legacy app remains available during the migration phase.
          </p>
        </div>
      </div>
    </aside>
  );
}
