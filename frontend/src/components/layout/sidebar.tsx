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
  { label: "Budgets", href: "/budgets" },
  { label: "Goals", href: "/goals" },
  { label: "Reports", href: "/reports" },
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

  return (
    <aside className="hidden h-screen w-72 shrink-0 flex-col border-r border-border bg-surface text-text lg:flex">
      <div className="shrink-0 px-7 pb-5 pt-7">
        <p className="text-[11px] font-black uppercase tracking-[0.14em] text-muted">
          Personal Finance
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-text">
          Vaul<span className="text-primary">ted</span>
        </h1>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        {isAdmin && effectiveIsAdmin ? (
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
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`focus-ring flex items-center rounded-xl px-4 py-3 text-sm font-bold transition-colors ${
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
      </div>

      <div className="sticky bottom-0 z-20 shrink-0 border-t border-border bg-surface/95 px-5 py-5 backdrop-blur">
        <div className="relative">
          <button
            type="button"
            className="focus-ring flex w-full items-center gap-3 rounded-2xl border border-border bg-bg p-3 text-left shadow-sm transition-colors hover:bg-surface-hover"
            onClick={() => setProfileMenuOpen((open) => !open)}
            aria-expanded={profileMenuOpen}
            aria-haspopup="menu"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/30 bg-primary/10 font-mono text-sm font-black text-primary">
              {avatarInitial}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-text">
                {user?.UserName || "Account"}
              </p>
              <p className="truncate text-xs font-semibold text-muted">
                {isAdmin ? `${scopeMode} VIEW` : role}
              </p>
            </div>

            <span className="text-sm text-muted">{profileMenuOpen ? "^" : "v"}</span>
          </button>

          {profileMenuOpen ? (
            <div
              className="absolute bottom-[calc(100%+10px)] left-0 z-50 w-full rounded-2xl border border-border bg-surface p-3 shadow-2xl"
              role="menu"
            >
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
