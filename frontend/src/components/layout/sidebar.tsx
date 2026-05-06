"use client";

import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  CircleDollarSign,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
  Target,
  Users,
  Wallet
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAuth } from "@/providers/auth-provider";
import { useUserScope } from "@/providers/user-scope-provider";

type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  adminOnly?: boolean;
};

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Transactions", href: "/transactions", icon: CircleDollarSign },
  { label: "Budgets", href: "/budgets", icon: Wallet },
  { label: "Goals", href: "/goals", icon: Target },
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "User Management", href: "/user-management", icon: Users, adminOnly: true }
];

type SidebarProps = {
  collapsed?: boolean;
  onToggleCollapsed?: () => void;
};

function getInitial(name?: string | null, email?: string | null): string {
  const source = (name || email || "U").trim();
  return source.charAt(0).toUpperCase();
}

export function Sidebar({ collapsed = false, onToggleCollapsed }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAdmin, clearSession } = useAuth();
  const {
    users,
    selectedUserId,
    setSelectedUserId,
    loadingUsers,
    scopeMode,
    setScopeMode,
    effectiveIsAdmin
  } = useUserScope();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const visibleItems = navItems.filter((item) => !item.adminOnly || effectiveIsAdmin);
  const avatarInitial = useMemo(
    () => getInitial(user?.UserName, user?.Email),
    [user?.Email, user?.UserName]
  );
  const role = String(user?.UserRole || "USER").toUpperCase();
  const selectedUser = users.find((row) => row.UserID === selectedUserId);

  const profileMenuClass = collapsed
    ? "absolute bottom-0 left-[calc(100%+10px)] z-50 w-64 rounded-2xl border border-border bg-surface p-3 shadow-2xl"
    : "absolute bottom-[calc(100%+10px)] left-0 z-50 w-full rounded-2xl border border-border bg-surface p-3 shadow-2xl";

  return (
    <aside
      className={`hidden h-screen shrink-0 flex-col border-r border-border bg-surface text-text lg:flex ${
        collapsed ? "w-20" : "w-72"
      }`}
    >
      <div className={collapsed ? "shrink-0 px-2 pb-4 pt-4" : "shrink-0 px-7 pb-6 pt-8"}>
        {collapsed ? (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="focus-ring rounded-lg border border-border bg-bg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-text"
              aria-label="Expand sidebar"
              title="Expand sidebar"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3">
              <h1 className="text-5xl font-black leading-none tracking-tight">
                <span className="text-text">Va</span>
                <span className="text-primary">ult</span>
              </h1>
              <button
                type="button"
                onClick={onToggleCollapsed}
                className="focus-ring rounded-lg border border-border bg-bg p-2 text-muted transition-colors hover:bg-surface-hover hover:text-text"
                aria-label="Collapse sidebar"
                title="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-sm font-medium text-muted">Your Personal Finance.</p>
          </>
        )}
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto ${collapsed ? "px-2 pb-4" : "px-5 pb-5"}`}>
        {!collapsed && isAdmin && effectiveIsAdmin ? (
          <div className="mb-5 rounded-2xl border border-border bg-bg p-3">
            <label className="mb-2 block text-xs font-semibold text-muted">
              Current User Scope
            </label>
            <select
              className="focus-ring w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-medium text-text"
              value={selectedUserId ?? ""}
              onChange={(event) => setSelectedUserId(Number(event.target.value))}
              disabled={loadingUsers || users.length === 0}
            >
              {users.map((row) => (
                <option key={row.UserID} value={row.UserID}>
                  {row.UserName}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <nav className="space-y-2">
          {visibleItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            const ItemIcon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                title={collapsed ? item.label : undefined}
                aria-label={item.label}
                className={`focus-ring flex items-center rounded-xl transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-text hover:bg-surface-hover"
                } ${
                  collapsed
                    ? "justify-center px-2 py-3"
                    : "px-4 py-3 text-sm font-bold"
                }`}
              >
                <ItemIcon
                  className={`${collapsed ? "" : "mr-3"} h-4 w-4 shrink-0`}
                  strokeWidth={2.25}
                />
                {collapsed ? <span className="sr-only">{item.label}</span> : item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <div className={`sticky bottom-0 z-20 shrink-0 border-t border-border bg-surface/95 backdrop-blur ${collapsed ? "px-2 py-4" : "px-5 py-5"}`}>
        <div className="relative">
          <button
            type="button"
            className={`focus-ring flex w-full items-center rounded-2xl border border-border bg-bg shadow-sm transition-colors hover:bg-surface-hover ${
              collapsed ? "justify-center p-2.5" : "gap-3 p-3 text-left"
            }`}
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
            title={collapsed ? "Account menu" : undefined}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-sm font-black text-primary">
              {avatarInitial}
            </div>

            {collapsed ? null : (
              <>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-text">
                    {user?.UserName || "Account"}
                  </p>
                  <p className="truncate text-xs font-semibold text-muted">
                    {isAdmin ? `${scopeMode} VIEW` : role}
                  </p>
                </div>

                <span className="text-sm text-muted">{profileMenuOpen ? "^" : "v"}</span>
              </>
            )}
          </button>

          {profileMenuOpen ? (
            <div className={profileMenuClass} role="menu">
              <div className="border-b border-border pb-3">
                <p className="truncate text-sm font-black text-text">
                  {user?.UserName || "-"}
                </p>
                <p className="mt-1 truncate text-xs text-muted">
                  {user?.Email || "-"}
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase transition-colors ${
                      !isAdmin || scopeMode === "USER"
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-bg text-muted hover:bg-surface-hover"
                    }`}
                    onClick={() => {
                      if (isAdmin) {
                        setScopeMode("USER");
                        setProfileMenuOpen(false);
                        router.replace("/dashboard");
                      }
                    }}
                  >
                    User
                  </button>

                  {isAdmin ? (
                    <button
                      type="button"
                      className={`rounded-full border px-2 py-1 text-[10px] font-black uppercase transition-colors ${
                        scopeMode === "ADMIN"
                          ? "border-danger/30 bg-danger/10 text-danger"
                          : "border-border bg-bg text-muted hover:bg-surface-hover"
                      }`}
                      onClick={() => {
                        setScopeMode("ADMIN");
                        setProfileMenuOpen(false);
                      }}
                    >
                      Admin
                    </button>
                  ) : null}
                </div>

                {isAdmin && effectiveIsAdmin ? (
                  <p className="mt-3 rounded-xl bg-bg px-3 py-2 text-xs text-muted">
                    Viewing data as{" "}
                    <span className="font-bold text-text">
                      {selectedUser?.UserName || "selected user"}
                    </span>
                  </p>
                ) : null}
              </div>

              <div className="py-2">
                <button
                  type="button"
                  className="focus-ring w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-text transition-colors hover:bg-surface-hover"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    router.push("/profile");
                  }}
                >
                  Personal Info
                </button>
                <button
                  type="button"
                  className="focus-ring w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-text transition-colors hover:bg-surface-hover"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    router.push("/profile?tab=password");
                  }}
                >
                  Change Password
                </button>
              </div>

              <button
                type="button"
                className="focus-ring w-full rounded-lg px-3 py-2 text-left text-sm font-bold text-danger transition-colors hover:bg-danger/10"
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
      </div>
    </aside>
  );
}
